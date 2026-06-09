// Geração de payload PIX estático (EMV/QR Code) conforme manual do Banco Central
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xffff) | 0).toString(16).toUpperCase().padStart(4, '0');
}

function field(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

export interface PixPayload {
  key: string;
  keyType: 'cpf' | 'email' | 'phone' | 'random';
  amount: number;        // em reais (ex: 150.00)
  merchantName: string;  // max 25 chars
  merchantCity: string;  // max 15 chars
  txId?: string;         // max 25 chars (identificador)
  description?: string;  // max 30 chars
}

export function generatePixPayload(params: PixPayload): string {
  const { key, amount, merchantName, merchantCity, txId = '***', description } = params;

  const gui = field('00', 'BR.GOV.BCB.PIX');
  const pixKey = field('01', key);
  const desc = description ? field('02', description.slice(0, 30)) : '';
  const merchantAccountInfo = field('26', gui + pixKey + desc);

  const mcc = field('52', '0000');
  const currency = field('53', '986');
  const amountStr = field('54', amount.toFixed(2));
  const country = field('58', 'BR');
  const name = field('59', merchantName.slice(0, 25));
  const city = field('60', merchantCity.slice(0, 15));
  const txIdField = field('05', (txId || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***');
  const additionalData = field('62', txIdField);

  const payload = `${field('00', '01')}${merchantAccountInfo}${mcc}${currency}${amountStr}${country}${name}${city}${additionalData}6304`;
  const crc = crc16(payload);

  return `${payload}${crc}`;
}
