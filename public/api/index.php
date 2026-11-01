<?php
/**
 * Practice REST API. Every request is routed here by .htaccess.
 *
 * Data is stored per sandbox (X-Sandbox-Id header, default "public") as a small
 * JSON file in ./data. Sandboxes reset to seed data after an hour of age.
 * Written for PHP 7.4+ so it runs on typical cPanel hosts.
 */

declare(strict_types=1);

const DATA_DIR = __DIR__ . '/data';
const SANDBOX_TTL = 3600;
const MAX_USERS = 200;
const USERNAME = 'practice';
const PASSWORD = 'SuperSecret123';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sandbox-Id');
header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $status, $body = null): void
{
    http_response_code($status);
    if ($body !== null) {
        echo json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    exit;
}

function fail(int $status, string $message, array $extra = []): void
{
    respond($status, array_merge(['error' => $message], $extra));
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, 'Request body must be valid JSON.');
    }
    return $data;
}

function sandbox_id(): string
{
    $id = $_SERVER['HTTP_X_SANDBOX_ID'] ?? 'public';
    if (!preg_match('/^[A-Za-z0-9_-]{1,32}$/', $id)) {
        fail(400, 'X-Sandbox-Id must be 1-32 letters, digits, "-" or "_".');
    }
    return $id;
}

function token_for(string $sandbox): string
{
    return 'tap_' . substr(hash('sha256', USERNAME . '|' . $sandbox . '|' . __FILE__), 0, 32);
}

function require_auth(string $sandbox): void
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(\S+)$/i', $header, $m)) {
        fail(401, 'Missing bearer token. POST /api/auth/login to get one.');
    }
    if (!hash_equals(token_for($sandbox), $m[1])) {
        fail(403, 'Invalid token.');
    }
}

function seed(): array
{
    $people = [
        ['Ana Silva', 'QA Engineer'], ['Bruno Costa', 'Developer'], ['Carla Mendes', 'SDET'],
        ['Diogo Ramos', 'Product Owner'], ['Elena Garcia', 'Tech Lead'], ['Filipe Sousa', 'DevOps'],
        ['Grace Hopper', 'Architect'], ['Hugo Martins', 'QA Engineer'], ['Inês Pereira', 'Designer'],
        ['João Ferreira', 'Developer'], ['Kim Novak', 'Scrum Master'], ['Luís Oliveira', 'SDET'],
    ];
    $users = [];
    foreach ($people as $i => [$name, $job]) {
        $slug = strtolower(str_replace(' ', '.', iconv('UTF-8', 'ASCII//TRANSLIT', $name) ?: $name));
        $users[] = [
            'id' => $i + 1,
            'name' => $name,
            'email' => preg_replace('/[^a-z.]/', '', $slug) . '@example.com',
            'job' => $job,
            'createdAt' => '2026-01-' . str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) . 'T09:00:00Z',
        ];
    }
    return ['createdAt' => time(), 'nextId' => count($users) + 1, 'users' => $users];
}

/** Runs $fn against the sandbox data under an exclusive lock and saves the result. */
function with_store(string $sandbox, callable $fn)
{
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0755, true);
    }
    $fh = fopen(DATA_DIR . "/$sandbox.json", 'c+');
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $store = $raw ? json_decode($raw, true) : null;
    if (!is_array($store) || time() - ($store['createdAt'] ?? 0) > SANDBOX_TTL) {
        $store = seed();
    }
    $result = $fn($store);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($store, JSON_UNESCAPED_UNICODE));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function validate_user(array $in, bool $partial): array
{
    $errors = [];
    $out = [];
    foreach (['name', 'email', 'job'] as $field) {
        if (!array_key_exists($field, $in)) {
            if (!$partial && $field !== 'job') {
                $errors[$field] = 'This field is required.';
            }
            continue;
        }
        if (!is_string($in[$field])) {
            $errors[$field] = 'Must be a string.';
            continue;
        }
        $out[$field] = trim($in[$field]);
    }
    if (isset($out['name']) && (mb_strlen($out['name']) < 2 || mb_strlen($out['name']) > 60)) {
        $errors['name'] = 'Must be 2-60 characters.';
    }
    if (isset($out['email']) && !filter_var($out['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Must be a valid email address.';
    }
    if (isset($out['job']) && mb_strlen($out['job']) > 60) {
        $errors['job'] = 'Must be at most 60 characters.';
    }
    if ($errors) {
        fail(422, 'Validation failed.', ['fields' => $errors]);
    }
    return $out;
}

function find_index(array $users, int $id): int
{
    foreach ($users as $i => $u) {
        if ($u['id'] === $id) {
            return $i;
        }
    }
    fail(404, "User $id not found.");
    return -1;
}

// ---- Routing ---------------------------------------------------------------

$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$route = '/' . trim(substr($path, strlen($base)), '/');
$sandbox = sandbox_id();

if ($route === '/' || $route === '/health') {
    respond(200, ['status' => 'ok', 'time' => gmdate('c'), 'sandbox' => $sandbox]);
}

if ($route === '/auth/login') {
    if ($method !== 'POST') {
        fail(405, 'Use POST.');
    }
    $in = json_body();
    if (($in['username'] ?? null) !== USERNAME || ($in['password'] ?? null) !== PASSWORD) {
        fail(401, 'Invalid username or password.');
    }
    respond(200, ['token' => token_for($sandbox), 'tokenType' => 'Bearer']);
}

if ($route === '/reset') {
    if ($method !== 'POST') {
        fail(405, 'Use POST.');
    }
    with_store($sandbox, function (array &$store) {
        $store = seed();
    });
    respond(200, ['message' => "Sandbox \"$sandbox\" reset."]);
}

if (preg_match('#^/status/(\d{3})$#', $route, $m)) {
    $code = (int) $m[1];
    if ($code < 200 || $code > 599) {
        fail(400, 'Status must be between 200 and 599.');
    }
    respond($code, $code === 204 ? null : ['status' => $code]);
}

if (preg_match('#^/delay/(\d+)$#', $route, $m)) {
    $seconds = min((int) $m[1], 10);
    sleep($seconds);
    respond(200, ['delayedSeconds' => $seconds]);
}

if ($route === '/echo') {
    $headers = [];
    foreach ($_SERVER as $k => $v) {
        if (strpos($k, 'HTTP_') === 0) {
            $headers[str_replace('_', '-', strtolower(substr($k, 5)))] = $v;
        }
    }
    unset($headers['cookie']);
    respond(200, [
        'method' => $method,
        'query' => $_GET,
        'headers' => $headers,
        'body' => json_decode((string) file_get_contents('php://input'), true),
    ]);
}

if ($route === '/users') {
    if ($method === 'GET') {
        $page = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 6)));
        $search = strtolower(trim((string) ($_GET['search'] ?? '')));
        $users = with_store($sandbox, function (array &$store) {
            return $store['users'];
        });
        if ($search !== '') {
            $users = array_values(array_filter($users, function ($u) use ($search) {
                return strpos(strtolower($u['name'] . ' ' . $u['email'] . ' ' . $u['job']), $search) !== false;
            }));
        }
        respond(200, [
            'page' => $page,
            'limit' => $limit,
            'total' => count($users),
            'totalPages' => (int) ceil(count($users) / $limit),
            'data' => array_slice($users, ($page - 1) * $limit, $limit),
        ]);
    }
    if ($method === 'POST') {
        require_auth($sandbox);
        $in = validate_user(json_body(), false);
        $user = with_store($sandbox, function (array &$store) use ($in) {
            if (count($store['users']) >= MAX_USERS) {
                fail(409, 'Sandbox is full (' . MAX_USERS . ' users). POST /api/reset to start over.');
            }
            foreach ($store['users'] as $u) {
                if (strcasecmp($u['email'], $in['email']) === 0) {
                    fail(409, 'A user with this email already exists.');
                }
            }
            $user = ['id' => $store['nextId']++, 'name' => $in['name'], 'email' => $in['email'], 'job' => $in['job'] ?? '', 'createdAt' => gmdate('Y-m-d\TH:i:s\Z')];
            $store['users'][] = $user;
            return $user;
        });
        header('Location: ' . $base . '/users/' . $user['id']);
        respond(201, $user);
    }
    fail(405, 'Use GET or POST.');
}

if (preg_match('#^/users/(\d+)$#', $route, $m)) {
    $id = (int) $m[1];
    if ($method === 'GET') {
        $user = with_store($sandbox, function (array &$store) use ($id) {
            return $store['users'][find_index($store['users'], $id)];
        });
        respond(200, $user);
    }
    if ($method === 'PUT' || $method === 'PATCH') {
        require_auth($sandbox);
        $in = validate_user(json_body(), $method === 'PATCH');
        $user = with_store($sandbox, function (array &$store) use ($id, $in, $method) {
            $i = find_index($store['users'], $id);
            $current = $store['users'][$i];
            $next = $method === 'PUT'
                ? ['id' => $id, 'name' => $in['name'], 'email' => $in['email'], 'job' => $in['job'] ?? '', 'createdAt' => $current['createdAt']]
                : array_merge($current, $in);
            $next['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
            $store['users'][$i] = $next;
            return $next;
        });
        respond(200, $user);
    }
    if ($method === 'DELETE') {
        require_auth($sandbox);
        with_store($sandbox, function (array &$store) use ($id) {
            array_splice($store['users'], find_index($store['users'], $id), 1);
        });
        respond(204);
    }
    fail(405, 'Use GET, PUT, PATCH or DELETE.');
}

fail(404, "No route for $method $route.");
