<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// Load .env if present
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim(trim($parts[1]), "\"'");
            if (!getenv($key)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
            }
        }
    }
}

$apiKey = getenv('RESEND_API_KEY') ?: ($_ENV['RESEND_API_KEY'] ?? '');
$toEmail = getenv('TO_EMAIL') ?: ($_ENV['TO_EMAIL'] ?? 'rodeorent1@gmail.com');
$fromEmail = getenv('FROM_EMAIL') ?: ($_ENV['FROM_EMAIL'] ?? 'RODEO EVENT <onboarding@resend.dev>');

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'RESEND_API_KEY is not configured on the server.']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

$name = trim($data['name'] ?? '');
$contact = trim($data['contact'] ?? '');
$product = $data['product'] ?? 'bull';
$productLabel = $data['productLabel'] ?? '';
$date = $data['date'] ?? '';
$location = $data['location'] ?? '';
$eventTypeLabel = $data['eventTypeLabel'] ?? '';
$duration = $data['duration'] ?? '';
$hours = $data['hours'] ?? '';
$estimate = $data['estimate'] ?? '';
$notes = $data['notes'] ?? '';
$language = $data['language'] ?? 'ru';

if ($name === '' || $contact === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Name and contact are required.']);
    exit;
}

$isRu = ($language === 'ru');
$chosenProduct = $productLabel ?: ($product === 'castle' ? ($isRu ? 'Пожарный батут' : 'Tuletõrje batuut') : ($product === 'both' ? ($isRu ? 'Оба аттракциона' : 'Mõlemad atraktsioonid') : ($isRu ? 'Механический бык' : 'Mehaaniline pull')));
$dateStr = $date ? " ($date)" : '';
$subject = "Новая заявка: $name — $chosenProduct$dateStr (RODEO EVENT)";

$displayDuration = $duration ?: ($hours ? "$hours " . ($isRu ? 'ч.' : 'tundi') : ($product === 'castle' ? ($isRu ? '1 день' : '1 päev') : '—'));

// Detect reply-to email if client provided an email
$replyTo = null;
if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $contact, $matches)) {
    $replyTo = $matches[0];
}

$timestamp = date('d.m.Y H:i');

$rows = [
    ['label' => ($isRu ? 'Аттракцион' : 'Atraktsioon'), 'value' => $chosenProduct, 'highlight' => true],
    ['label' => ($isRu ? 'Имя клиента' : 'Kliendi nimi'), 'value' => $name, 'highlight' => false],
    ['label' => ($isRu ? 'Телефон / Email' : 'Telefon / E-post'), 'value' => $contact, 'highlight' => false],
    ['label' => ($isRu ? 'Дата мероприятия' : 'Ürituse kuupäev'), 'value' => ($date ?: ($isRu ? 'Не указана' : 'Määramata')), 'highlight' => false],
    ['label' => ($isRu ? 'Место проведения' : 'Toimumiskoht'), 'value' => ($location ?: ($isRu ? 'Не указано' : 'Määramata')), 'highlight' => false],
    ['label' => ($isRu ? 'Тип мероприятия' : 'Ürituse tüüp'), 'value' => ($eventTypeLabel ?: ($isRu ? 'Не указан' : 'Määramata')), 'highlight' => false],
    ['label' => ($isRu ? 'Длительность' : 'Rendi kestus'), 'value' => $displayDuration, 'highlight' => false],
    ['label' => ($isRu ? 'Предварительная стоимость' : 'Esialgne hind'), 'value' => ($estimate ?: '—'), 'highlight' => true],
    ['label' => ($isRu ? 'Пожелания и детали' : 'Lisamärkused'), 'value' => ($notes ?: ($isRu ? 'Нет комментариев' : 'Märkusi pole')), 'highlight' => false],
    ['label' => ($isRu ? 'Язык заявки' : 'Päringu keel'), 'value' => strtoupper($language), 'highlight' => false],
];

$htmlRows = '';
$textRows = '';
foreach ($rows as $r) {
    $lbl = htmlspecialchars($r['label'], ENT_QUOTES, 'UTF-8');
    $val = nl2br(htmlspecialchars($r['value'], ENT_QUOTES, 'UTF-8'));
    $color = $r['highlight'] ? '#9e292b' : '#1d1b1b';
    $weight = $r['highlight'] ? '800' : '400';
    $size = $r['highlight'] ? '16px' : '14px';
    $htmlRows .= "<tr>
      <td style=\"padding:11px 16px; border-bottom:1px solid #ebe5df; color:#665f59; font-size:13px; font-weight:700; width:38%; vertical-align:top;\">$lbl</td>
      <td style=\"padding:11px 16px; border-bottom:1px solid #ebe5df; color:$color; font-size:$size; font-weight:$weight; vertical-align:top;\">$val</td>
    </tr>";
    $textRows .= "{$r['label']}: {$r['value']}\n";
}

$replyHintHtml = '';
if ($replyTo) {
    $safeReply = htmlspecialchars($replyTo, ENT_QUOTES, 'UTF-8');
    $replyHintHtml = "<tr><td style=\"padding: 10px 30px 20px;\"><div style=\"background:#faf7f4; border:1px solid #ebd9da; border-left:3px solid #9e292b; padding:12px 16px; border-radius:4px; font-size:12px; color:#554e48;\">💡 <strong>Быстрый ответ:</strong> Нажмите «Ответить» в почте, чтобы написать на <strong>$safeReply</strong>.</div></td></tr>";
}

$headerSubtitle = $isRu ? "Новая заявка с сайта • $timestamp" : "Uus päring veebilehelt • $timestamp";
$safeSubject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');

$html = "<!DOCTYPE html>
<html lang=\"ru\">
<head><meta charset=\"utf-8\"><title>$safeSubject</title></head>
<body style=\"margin:0; padding:24px 12px; background-color:#f5f1ec; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1d1b1b;\">
  <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px; margin:0 auto; background:#ffffff; border-radius:6px; overflow:hidden; border:1px solid #dfd7cf; box-shadow:0 4px 16px rgba(0,0,0,0.06);\">
    <tr>
      <td style=\"background-color:#1b1919; padding:26px 30px; border-bottom:4px solid #9e292b;\">
        <h1 style=\"margin:0; color:#ffffff; font-size:22px; font-weight:900; letter-spacing:0.04em; text-transform:uppercase;\">RODEO <span style=\"color:#9e292b;\">EVENT.</span></h1>
        <p style=\"margin:6px 0 0; color:#b0a8a0; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:600;\">$headerSubtitle</p>
      </td>
    </tr>
    <tr>
      <td style=\"padding:24px 30px 10px;\">
        <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\">$htmlRows</table>
      </td>
    </tr>
    $replyHintHtml
    <tr>
      <td style=\"background-color:#f7f4f0; padding:18px 30px; border-top:1px solid #ebe5df; font-size:11px; color:#857d76; text-align:center;\">
        RODEO EVENT • Аренда аттракционов в Эстонии<br>
        Email: <a href=\"mailto:rodeorent1@gmail.com\" style=\"color:#857d76; text-decoration:underline;\">rodeorent1@gmail.com</a> • Тел: +372 55677080 / +372 53010451
      </td>
    </tr>
  </table>
</body>
</html>";

$text = "RODEO EVENT — " . ($isRu ? 'Новая заявка с сайта' : 'Uus päring veebilehelt') . " ($timestamp)\n\n$textRows\n\n---\nRODEO EVENT: rodeorent1@gmail.com";

$payload = [
    'from' => $fromEmail,
    'to' => [$toEmail],
    'subject' => $subject,
    'html' => $html,
    'text' => $text,
];

if ($replyTo) {
    $payload['reply_to'] = $replyTo;
}

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . trim($apiKey),
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 15,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => "cURL error: $curlError"]);
    exit;
}

$resData = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode(['ok' => true, 'id' => ($resData['id'] ?? null)]);
} else {
    http_response_code($httpCode ?: 500);
    $errMsg = $resData['message'] ?? ($resData['error'] ?? "Resend API returned HTTP $httpCode");
    echo json_encode(['ok' => false, 'error' => $errMsg]);
}
