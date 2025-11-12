import sys
import time
import importlib.util
import pathlib
import pytest

# Load the bridge_host module directly from file path to avoid package import issues in test runner
bridge_path = pathlib.Path(__file__).resolve().parent.parent / 'native_host' / 'bridge_host.py'
spec = importlib.util.spec_from_file_location('bridge_host', str(bridge_path))
bh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bh)


def test_run_and_kill_workspace():
    # Use a short-lived python sleep command to create a process
    cmd = f'{sys.executable} -c "import time; time.sleep(2)"'
    payload = {"cwd": ".", "command": cmd, "shell": True}

    resp = bh.run_workspace_command(payload)
    assert resp and resp.get('status') == 'started', f"Failed to start workspace: {resp}"
    pid = resp.get('pid')
    wid = resp.get('id')
    assert pid is not None

    # Immediately list workspaces and ensure our entry is present
    listing = bh.list_workspaces()
    assert listing and listing.get('status') == 'ok'
    workspaces = listing.get('workspaces', [])
    assert any((w.get('pid') == pid or w.get('id') == wid) for w in workspaces)

    # Now attempt to kill the workspace
    kill_resp = bh.kill_workspace({"id": wid})
    assert kill_resp and kill_resp.get('status') in ('stopped',), f"Kill failed: {kill_resp}"

    # Ensure it's no longer running
    listing2 = bh.list_workspaces()
    assert all(not w.get('running') for w in listing2.get('workspaces', []))
