#!/usr/bin/env python3
"""
ClickFlash / Antigravity Conversation Recovery Tool
Allows searching, listing, viewing, and exporting all 500+ local agent conversations and transcripts.
"""

import os
import sys
import json
import re
import argparse
from datetime import datetime

BRAIN_DIR = os.path.expanduser(r"~/.gemini/antigravity/brain")
CONVOS_DIR = os.path.expanduser(r"~/.gemini/antigravity/conversations")

def extract_clean_prompt(text):
    if not text:
        return ""
    m = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", text, re.DOTALL)
    if m:
        text = m.group(1)
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(text.split())

def load_or_build_index():
    convos = []
    if not os.path.exists(BRAIN_DIR):
        print(f"Error: Brain directory not found at {BRAIN_DIR}")
        return convos

    subdirs = [d for d in os.listdir(BRAIN_DIR) if os.path.isdir(os.path.join(BRAIN_DIR, d)) and d != "tempmediaStorage"]
    for convo_id in subdirs:
        convo_path = os.path.join(BRAIN_DIR, convo_id)
        transcript_path = os.path.join(convo_path, ".system_generated", "logs", "transcript.jsonl")
        
        artifacts = []
        try:
            for f in os.listdir(convo_path):
                if f.endswith(".md"):
                    artifacts.append(f)
        except Exception:
            pass

        mtime = 0
        if os.path.exists(transcript_path):
            mtime = os.path.getmtime(transcript_path)
        elif os.path.exists(convo_path):
            mtime = os.path.getmtime(convo_path)

        mtime_str = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S") if mtime else "Unknown"
        first_prompt = ""
        user_msg_count = 0
        total_steps = 0

        if os.path.exists(transcript_path):
            try:
                with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        total_steps += 1
                        if '"USER_INPUT"' in line:
                            try:
                                obj = json.loads(line)
                                if obj.get("type") == "USER_INPUT":
                                    user_msg_count += 1
                                    clean = extract_clean_prompt(obj.get("content", ""))
                                    if not first_prompt and clean:
                                        first_prompt = clean
                            except Exception:
                                pass
            except Exception:
                pass

        convos.append({
            "id": convo_id,
            "mtime": mtime,
            "mtime_str": mtime_str,
            "first_prompt": first_prompt,
            "user_msg_count": user_msg_count,
            "total_steps": total_steps,
            "artifacts": artifacts,
            "path": convo_path,
            "transcript": transcript_path if os.path.exists(transcript_path) else None
        })

    convos.sort(key=lambda x: x["mtime"], reverse=True)
    return convos

def list_recent(convos, limit=25):
    print(f"\n{'='*90}")
    print(f"Top {limit} Most Recent Conversations (Total: {len(convos)})")
    print(f"{'='*90}")
    for i, c in enumerate(convos[:limit], 1):
        prompt = c["first_prompt"][:80] if c["first_prompt"] else "(No prompt recorded)"
        arts = f" | Artifacts: {', '.join(c['artifacts'])}" if c['artifacts'] else ""
        print(f"\n{i:2d}. [{c['mtime_str']}] Convo ID: {c['id']}")
        print(f"    Link: conversation://{c['id']}")
        print(f"    Turns: {c['user_msg_count']} | Steps: {c['total_steps']}{arts}")
        print(f"    Topic: {prompt}")

def search_convos(convos, query):
    query_lower = query.lower()
    matches = []
    print(f"\nSearching for '{query}' across {len(convos)} conversations...")
    
    for c in convos:
        matched = False
        match_snippet = ""
        # check initial prompt
        if query_lower in c["first_prompt"].lower():
            matched = True
            match_snippet = c["first_prompt"][:120]
        elif query_lower in c["id"].lower():
            matched = True
            match_snippet = f"Match on Conversation ID: {c['id']}"
        elif any(query_lower in a.lower() for a in c["artifacts"]):
            matched = True
            match_snippet = f"Match in artifacts: {', '.join(c['artifacts'])}"
        elif c["transcript"] and os.path.exists(c["transcript"]):
            # deep search transcript
            try:
                with open(c["transcript"], "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        if query_lower in line.lower():
                            matched = True
                            match_snippet = f"Found inside transcript log"
                            break
            except Exception:
                pass
                
        if matched:
            matches.append((c, match_snippet))

    print(f"\nFound {len(matches)} matching conversation(s):")
    print(f"{'-'*90}")
    for i, (c, snip) in enumerate(matches[:30], 1):
        print(f"{i:2d}. [{c['mtime_str']}] {c['id']}")
        print(f"    Link: conversation://{c['id']}")
        print(f"    Turns: {c['user_msg_count']} | Steps: {c['total_steps']}")
        print(f"    Match: {snip}\n")
    if len(matches) > 30:
        print(f"... and {len(matches) - 30} more matches.")

def export_convo(convo_id, output_path=None):
    convo_path = os.path.join(BRAIN_DIR, convo_id)
    transcript_path = os.path.join(convo_path, ".system_generated", "logs", "transcript.jsonl")
    if not os.path.exists(transcript_path):
        print(f"Error: Transcript not found for {convo_id}")
        return

    if not output_path:
        output_path = f"recovered_convo_{convo_id[:8]}.md"

    out_lines = [f"# Recovered Conversation: {convo_id}\n", f"> URI: `conversation://{convo_id}`\n\n"]
    with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                obj = json.loads(line)
                step_type = obj.get("type", "")
                content = obj.get("content", "")
                if step_type == "USER_INPUT":
                    clean = extract_clean_prompt(content)
                    out_lines.append(f"\n## 👤 User\n\n{clean}\n")
                elif step_type == "PLANNER_RESPONSE" and content:
                    out_lines.append(f"\n## 🤖 Assistant\n\n{content}\n")
            except Exception:
                pass

    with open(output_path, "w", encoding="utf-8") as f:
        f.writelines(out_lines)
    print(f"Successfully exported conversation to {os.path.abspath(output_path)}")

def main():
    parser = argparse.ArgumentParser(description="ClickFlash / Antigravity Conversation Recovery Tool")
    parser.add_argument("--list", "-l", type=int, default=20, help="List top N recent conversations")
    parser.add_argument("--search", "-s", type=str, help="Search conversations by keyword or pattern")
    parser.add_argument("--export", "-e", type=str, help="Export conversation ID to markdown transcript")
    parser.add_argument("--output", "-o", type=str, help="Output filename for export")
    args = parser.parse_args()

    convos = load_or_build_index()

    if args.export:
        export_convo(args.export, args.output)
    elif args.search:
        search_convos(convos, args.search)
    else:
        list_recent(convos, args.list)

if __name__ == "__main__":
    main()
