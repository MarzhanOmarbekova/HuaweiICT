"""
Huawei BCS client — optional. Falls back gracefully if not configured.
"""
import os
import requests
import logging

logger = logging.getLogger(__name__)

BCS_ENDPOINT = os.environ.get('BCS_REST_ENDPOINT', '')
BCS_TOKEN = os.environ.get('BCS_TOKEN', '')
BCS_CHANNEL = os.environ.get('BCS_CHANNEL', 'energy-channel')
BCS_CHAINCODE = os.environ.get('BCS_CHAINCODE', 'voltai-energy')


def is_bcs_enabled() -> bool:
    return bool(BCS_ENDPOINT and BCS_TOKEN)


def invoke_bcs(func_name: str, args: list) -> dict:
    """
    Invoke a chaincode function on Huawei BCS.
    Returns empty dict if BCS is not configured.
    """
    if not is_bcs_enabled():
        logger.info('[BCS] Not configured — skipping blockchain anchor')
        return {}
    try:
        resp = requests.post(
            f'{BCS_ENDPOINT}/api/v2/channels/{BCS_CHANNEL}/chaincodes/{BCS_CHAINCODE}/invoke',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {BCS_TOKEN}',
            },
            json={'func': func_name, 'args': args},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f'[BCS] Invoke failed: {e}. Continuing without BCS.')
        return {}


def query_bcs(func_name: str, args: list) -> dict:
    if not is_bcs_enabled():
        return {}
    try:
        resp = requests.get(
            f'{BCS_ENDPOINT}/api/v2/channels/{BCS_CHANNEL}/chaincodes/{BCS_CHAINCODE}/query',
            headers={'Authorization': f'Bearer {BCS_TOKEN}'},
            params={'func': func_name, 'args': ','.join(args)},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f'[BCS] Query failed: {e}')
        return {}
