import requests
import time

PROJECT_ID = "career-coach"
BASE_URL = f"http://127.0.0.1:8080/v1/projects/{PROJECT_ID}/databases/(default)/documents"

bet_id = "test_learning_bet_002"

# 1. Create the bet
print(f"Creating mock bet {bet_id}...")
create_payload = {
    "fields": {
        "source": {"stringValue": "hourly_automated"},
        "status": {"stringValue": "placed"},
        "target_date": {"stringValue": "2026-02-21"},
        "ai_reasoning": {"stringValue": "This bet is on Arsenal against a weak team. They are the clear favorite."},
        "events": {
            "arrayValue": {
                "values": [
                    {
                        "mapValue": {
                            "fields": {
                                "name": {"stringValue": "Arsenal vs Weak Team"},
                                "competition": {
                                    "mapValue": {
                                        "fields": {
                                            "name": {"stringValue": "Premier League"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        },
        "selections": {
            "mapValue": {
                "fields": {
                    "items": {
                        "arrayValue": {
                            "values": [
                                {
                                    "mapValue": {
                                        "fields": {
                                            "market": {"stringValue": "Match Odds"},
                                            "odds": {"doubleValue": 1.25},
                                            "stake": {"doubleValue": 20},
                                            "side": {"stringValue": "BACK"},
                                            "reasoning": {"stringValue": "Safe bet based on form."}
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
    }
}

create_url = f"{BASE_URL}/bet_slips?documentId={bet_id}"
r1 = requests.post(create_url, json=create_payload)
print(f"Create response: {r1.status_code}")

time.sleep(2)

# 2. Update the bet to 'finished'
print(f"Updating status to 'finished'...")
update_payload = {
    "fields": {
        "status": {"stringValue": "finished"},
        "settlement_results": {
            "arrayValue": {
                "values": [
                    {
                        "mapValue": {
                            "fields": {
                                "profit": {"doubleValue": -20},
                                "status": {"stringValue": "LOST"},
                                "comment": {"stringValue": "Arsenal drew 1-1."}
                            }
                        }
                    }
                ]
            }
        },
        "balance": {
            "mapValue": {
                "fields": {
                    "starting": {"doubleValue": 100},
                    "ending": {"doubleValue": 80}
                }
            }
        }
    }
}

update_url = f"{BASE_URL}/bet_slips/{bet_id}?updateMask.fieldPaths=status&updateMask.fieldPaths=settlement_results&updateMask.fieldPaths=balance"
r2 = requests.patch(update_url, json=update_payload)
print(f"Update response: {r2.status_code}")
