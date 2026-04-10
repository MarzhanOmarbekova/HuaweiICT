import os
import requests
import logging
import urllib3


logger = logging.getLogger(__name__)

# Загружаем данные из .env
AK = os.environ.get('BCS_AK', '')
SK = os.environ.get('BCS_SK', '')
PROJECT_ID = os.environ.get('BCS_PROJECT_ID', '')
BCS_ENDPOINT = os.environ.get('BCS_REST_ENDPOINT', '')
BCS_CHANNEL = os.environ.get('BCS_CHANNEL', 'channel')
BCS_CHAINCODE = os.environ.get('BCS_CHAINCODE', 'voltaibcs')
# Токен берем из ENV (тот, что получили в API Explorer)
BCS_TOKEN = os.environ.get('BCS_TOKEN', '')


def is_bcs_enabled() -> bool:
    # Система активна, если прописан эндпоинт и есть ключи или токен
    return bool(BCS_ENDPOINT and (BCS_TOKEN or AK))


# Пути к твоим файлам (проверь, где они лежат в проекте)
CERT_PATH = r'C:\Users\User\Downloads\voltai-blockchain-config\d638baba-2b15-1207-07c2-17f92f6f48b7-configs\89913c0834c6fade9cd1185a5d6e3835f2cd0902.peer\tls\server.crt'
KEY_PATH = r'C:\Users\User\Downloads\voltai-blockchain-config\d638baba-2b15-1207-07c2-17f92f6f48b7-configs\89913c0834c6fade9cd1185a5d6e3835f2cd0902.peer\tls\server.key'
ORDERER_CA = r'C:\Users\User\Downloads\voltai-blockchain-config\d638baba-2b15-1207-07c2-17f92f6f48b7-configs\c38856059b2bb4606d710e0aaf3847e8f642ccc9.orderer\msp\cacerts\ca.voltai-blockchain-orderer-cert.pem'

def invoke_bcs(func_name: str, args: list) -> dict:
    if not is_bcs_enabled():
        return {}

    url = f'{BCS_ENDPOINT}/bcs/v1/channels/{BCS_CHANNEL}/chaincodes/{BCS_CHAINCODE}/invoke'

    try:
        resp = requests.post(
            url,
            headers={'X-Auth-Token': BCS_TOKEN, 'Content-Type': 'application/json'},
            json={'function': func_name, 'args': args},
            # ДОБАВЛЯЕМ СЕРТИФИКАТЫ ЗДЕСЬ:
            cert=(CERT_PATH, KEY_PATH),  # Твой клиентский сертификат и ключ
            verify=False,  # Проверка сервера через CA сертификат
            timeout=10,
        )
        # Если 404, пробуем старый путь v2
        if resp.status_code == 404:
            url_v2 = f'{BCS_ENDPOINT}/api/v2/channels/{BCS_CHANNEL}/chaincodes/{BCS_CHAINCODE}/invoke'
            resp = requests.post(url_v2, headers=headers, json=payload, verify=False, timeout=5)

        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f'[BCS] Invoke failed: {e}')
        return {}


def query_bcs(func_name: str, args: list) -> dict:
    if not is_bcs_enabled():
        return {}

    url = f'{BCS_ENDPOINT}/bcs/v1/channels/{BCS_CHANNEL}/chaincodes/{BCS_CHAINCODE}/query'

    try:
        resp = requests.get(
            url,
            headers={'X-Auth-Token': BCS_TOKEN},
            params={'function': func_name, 'args': ','.join(args)},
            verify=False,
            timeout=5,
        )

        if resp.status_code == 404:
            url_v2 = f'{BCS_ENDPOINT}/api/v2/channels/{BCS_CHANNEL}/chaincodes/{BCS_CHAINCODE}/query'
            resp = requests.get(url_v2, headers={'X-Auth-Token': BCS_TOKEN},
                                params={'function': func_name, 'args': ','.join(args)},
                                verify=False, timeout=5)

        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f'[BCS] Query failed: {e}')
        return {}