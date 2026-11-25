#!/usr/bin/env python3
# planning-framework
"""UserPromptSubmit hook: the only way to open the planning gate.

Runs on messages typed by the user, never on Claude's own actions.
If a feature is in planning and the whole message is an approval phrase,
it creates .planning/approved.
"""
import json
import os
import sys
import time

PHRASES = {"approve plan", "одобряю план"}

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

prompt = (data.get("prompt") or "").strip().strip(".!").lower()
if prompt not in PHRASES:
    sys.exit(0)

root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd())
active = os.path.join(root, ".planning", "active")
approved = os.path.join(root, ".planning", "approved")

if not os.path.exists(active):
    print("Note: no feature is in planning, so there is nothing to approve.")
elif os.path.exists(approved):
    print("Note: the plan was already approved; the gate is open.")
else:
    open(approved, "w").close()
    with open(os.path.join(root, ".planning", "gate.log"), "a") as f:
        f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + "APPROVED by user message (gate open)\n")
    print("The user approved the plan. The gate is open: implementation may start now.")
sys.exit(0)
