"""Optional typed decision adapters. Offline by default; NEVER auto-bill external APIs."""
import json
import os
from urllib import request

ACTIONS = ("CONTINUE", "RETRY", "VERIFY", "ESCALATE", "COMPLETE")

class DecisionsDisabled(RuntimeError):
    pass

def build_request(state, *, model, options=ACTIONS):
    if len(state) > 2000 or not state:
        raise ValueError("Decision state length invalid")
    if not options or any(option not in ACTIONS for option in options):
        raise ValueError("Invalid decision options")
    return {
        "model": model,
        "state": state,
        "questions": {
            "next": {
                "type": "choice",
                "instructions": "Choose the best next action using uncertainty only; deterministic test failures cannot be overridden.",
                "criteria": {action: {
                    "CONTINUE": "Continue the assigned task",
                    "RETRY": "A bounded retry is justified",
                    "VERIFY": "Gather independent evidence",
                    "ESCALATE": "Escalate due to repeated failures or risk",
                    "COMPLETE": "Only if all evidence gates already passed",
                }[action] for action in options}
            }
        }
    }

def parse_choice(body, *, options=ACTIONS):
    try:
        answer = body["answers"]["next"]
        choice = answer["choice"]
        confidence = answer["confidence"]
        if choice not in options or type(confidence) not in (float, int) or not 0 <= confidence <= 1:
            raise ValueError("invalid decision")
        return {"choice": choice, "confidence": confidence}
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Decision provider returned invalid choice") from None

def request_decision(state, *, environ=None, opener=None):
    env = dict(os.environ if environ is None else environ)
    provider = env.get("DECISION_PROVIDER", "offline")
    if provider == "offline":
        return {"provider": "offline", "choice": None, "confidence": None}
    if env.get("ENABLE_EXTERNAL_DECISIONS") != "1":
        raise DecisionsDisabled("External decision APIs disabled by default")
    if provider == "jev":
        # Jev is a separately billed API. Require an additional explicit opt-in.
        if env.get("ALLOW_PAID_JEV_API") != "1":
            raise DecisionsDisabled("Jev is separately billed and has not been approved")
        key = env.get("TYPESAFE_API_KEY")
        url = "https://api.typesafe.ai/v1/systemone"
        model = "jev-latest"
    elif provider == "openrouter-free":
        key = env.get("OPENROUTER_API_KEY")
        url = "https://openrouter.ai/api/alpha/decisions"
        model = "inception/mercury-decide:free"
    else:
        raise DecisionsDisabled("Unknown decision provider")
    if not key:
        raise DecisionsDisabled("Decision API credential unavailable")
    req = request.Request(url, data=json.dumps(build_request(state, model=model)).encode(),
                          headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
                          method="POST")
    try:
        transport = opener or request.urlopen
        with transport(req, timeout=10) as response:
            payload = json.loads(response.read(65536))
        parsed = parse_choice(payload)
    except Exception:
        # Never display the credential, request headers, response body or sensitive state.
        raise RuntimeError("Decision API failed safely; use offline routing") from None
    return {"provider": provider, **parsed}
