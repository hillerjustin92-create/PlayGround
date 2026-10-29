#!/usr/bin/env python3
"""KI-Kumpel: ein Telegram-Bot mit Skills und OpenWebUI-Anbindung."""

import argparse
import asyncio
import json
import mimetypes
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

SKILLS_DIR = Path(
    os.environ.get("KUMPEL_SKILLS_DIR", "~/.local/share/ki-kumpel/skills")
).expanduser()
OPENWEBUI_BASE_URL = os.environ.get("OPENWEBUI_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
OPENWEBUI_API_KEY = os.environ.get("OPENWEBUI_API_KEY", "").strip()
OPENWEBUI_MODEL = os.environ.get("OPENWEBUI_MODEL", "").strip()
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
SYSTEM_PROMPT = os.environ.get(
    "KUMPEL_SYSTEM_PROMPT",
    "Du bist Kumpel, ein hilfreicher und freundlicher KI-Assistent. Antworte auf Deutsch.",
)
MAX_HISTORY = int(os.environ.get("KUMPEL_MAX_HISTORY", "20"))
SKILL_SUFFIXES = (".md", ".txt")
TELEGRAM_TEXT_LIMIT = 4000
TTS_ENABLED = os.environ.get("KUMPEL_TTS", "1").strip().lower() not in {
    "0",
    "false",
    "no",
    "off",
}
TTS_VOICE = os.environ.get("KUMPEL_TTS_VOICE", "de-DE-KatjaNeural").strip()
TTS_RATE = os.environ.get("KUMPEL_TTS_RATE", "+0%").strip()
TTS_PITCH = os.environ.get("KUMPEL_TTS_PITCH", "+0Hz").strip()
TTS_TIMEOUT = int(os.environ.get("KUMPEL_TTS_TIMEOUT", "30"))

_resolved_model = ""


def _read_text(path):
    return path.read_text(encoding="utf-8", errors="replace").strip()


def _skill_files():
    if not SKILLS_DIR.is_dir():
        return []
    return sorted(
        path
        for path in SKILLS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in SKILL_SUFFIXES and path.name != "liste.txt"
    )


def skills_liste():
    liste = SKILLS_DIR / "liste.txt"
    if liste.is_file():
        names = [
            line.strip()
            for line in _read_text(liste).splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        if names:
            return names
    return [path.stem for path in _skill_files()]


def _safe_skill_name(name):
    name = name.strip()
    if not name or name in {".", ".."} or "/" in name or "\\" in name:
        return ""
    return name


def skills_info(name=None):
    if name:
        safe_name = _safe_skill_name(name)
        if not safe_name:
            return "Ungültiger Skill-Name."
        for suffix in SKILL_SUFFIXES:
            path = SKILLS_DIR / f"{safe_name}{suffix}"
            if path.is_file():
                content = _read_text(path)
                return content or f"Skill '{safe_name}' ist leer."
        return f"Skill '{name}' nicht gefunden."

    liste = SKILLS_DIR / "liste.txt"
    if liste.is_file():
        content = _read_text(liste)
        if content:
            return content

    namen = skills_liste()
    if not namen:
        return f"Keine Skills in {SKILLS_DIR} gefunden."
    return "Verfügbare Skills:\n" + "\n".join(f"- {name}" for name in namen)


def openwebui_status():
    try:
        with urllib.request.urlopen(OPENWEBUI_BASE_URL, timeout=3) as response:
            return f"OpenWebUI läuft ({response.status})"
    except Exception as exc:
        return f"OpenWebUI nicht erreichbar: {exc}"


def _http_json(method, url, payload=None, headers=None, timeout=30):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    request.add_header("Accept", "application/json")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Verbindungsfehler: {exc.reason}") from exc
    if not body:
        return {}
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Ungültige JSON-Antwort: {body[:200]}") from exc


def _openwebui_headers():
    if not OPENWEBUI_API_KEY:
        return {}
    return {"Authorization": f"Bearer {OPENWEBUI_API_KEY}"}


def _resolve_model():
    global _resolved_model
    if OPENWEBUI_MODEL:
        return OPENWEBUI_MODEL
    if _resolved_model:
        return _resolved_model
    data = _http_json(
        "GET",
        f"{OPENWEBUI_BASE_URL}/api/models",
        headers=_openwebui_headers(),
        timeout=15,
    )
    models = data.get("data") or []
    if not models:
        raise RuntimeError(
            "Kein Modell gefunden. Setze OPENWEBUI_MODEL oder lade ein Modell in OpenWebUI."
        )
    _resolved_model = models[0].get("id") or models[0].get("name") or ""
    if not _resolved_model:
        raise RuntimeError("Das erste OpenWebUI-Modell hat keine ID.")
    return _resolved_model


def openwebui_chat(messages, model=None):
    payload = {
        "model": model or _resolve_model(),
        "messages": messages,
        "stream": False,
    }
    data = _http_json(
        "POST",
        f"{OPENWEBUI_BASE_URL}/api/chat/completions",
        payload=payload,
        headers=_openwebui_headers(),
        timeout=120,
    )
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unerwartete OpenWebUI-Antwort: {str(data)[:300]}") from exc
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    return str(content).strip()


def _split_text(text, limit=TELEGRAM_TEXT_LIMIT):
    text = text or ""
    chunks = []
    while len(text) > limit:
        split_at = text.rfind("\n", 0, limit)
        if split_at <= 0:
            split_at = limit
        chunks.append(text[:split_at])
        text = text[split_at:].lstrip("\n")
    if text:
        chunks.append(text)
    return chunks


def _speech_text(text):
    speech = re.sub(r"```.*?```", " Codeblock. ", text or "", flags=re.DOTALL)
    speech = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", speech)
    speech = re.sub(r"`([^`]*)`", r"\1", speech)
    speech = re.sub(r"[*_#>|]+", " ", speech)
    return re.sub(r"\s+", " ", speech).strip()


def _tts_edge(text, path):
    import edge_tts

    async def save():
        communicate = edge_tts.Communicate(
            text,
            TTS_VOICE,
            rate=TTS_RATE,
            pitch=TTS_PITCH,
            connect_timeout=min(10, TTS_TIMEOUT),
            receive_timeout=TTS_TIMEOUT,
        )
        await communicate.save(str(path))

    asyncio.run(save())
    if path.stat().st_size == 0:
        raise RuntimeError("Edge-TTS hat eine leere Datei erzeugt.")


def _tts_gtts(text, path):
    from gtts import gTTS

    gTTS(text=text, lang="de", slow=False, timeout=TTS_TIMEOUT).save(str(path))
    if path.stat().st_size == 0:
        raise RuntimeError("gTTS hat eine leere Datei erzeugt.")


def synthesize_voice(text):
    speech = _speech_text(text)
    if not speech:
        raise RuntimeError("Kein Text für die Sprachausgabe vorhanden.")

    handle, filename = tempfile.mkstemp(prefix="kumpel-", suffix=".mp3")
    os.close(handle)
    path = Path(filename)
    errors = []
    for name, backend in (("Edge-TTS", _tts_edge), ("gTTS", _tts_gtts)):
        try:
            backend(speech, path)
            return path
        except Exception as exc:
            errors.append(f"{name}: {exc}")
    path.unlink(missing_ok=True)
    raise RuntimeError("; ".join(errors) or "Keine TTS-Engine verfügbar.")


def _http_multipart(url, fields, file_field, file_path, timeout=60):
    boundary = f"----Kumpel{uuid.uuid4().hex}"
    parts = []
    for name, value in fields.items():
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n".encode("utf-8")
        )
    file_path = Path(file_path)
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; '
        f'filename="{file_path.name}"\r\nContent-Type: {content_type}\r\n\r\n'.encode(
            "utf-8"
        )
    )
    parts.append(file_path.read_bytes())
    parts.append(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    body = b"".join(parts)

    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    request.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Verbindungsfehler: {exc.reason}") from exc
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Ungültige JSON-Antwort: {raw[:200]}") from exc


class Telegram:
    def __init__(self, token):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{token}"

    def call(self, method, http_timeout=45, **params):
        data = _http_json(
            "POST",
            f"{self.base_url}/{method}",
            payload=params,
            timeout=http_timeout,
        )
        if not data.get("ok"):
            description = data.get("description", "Unbekannter Telegram-Fehler")
            raise RuntimeError(description)
        return data.get("result")

    def send_message(self, chat_id, text):
        for chunk in _split_text(text) or ["(leere Antwort)"]:
            self.call(
                "sendMessage",
                chat_id=chat_id,
                text=chunk,
                disable_web_page_preview=True,
                http_timeout=30,
            )

    def send_voice(self, chat_id, audio_path, caption=None):
        fields = {"chat_id": str(chat_id)}
        if caption:
            fields["caption"] = caption[:1024]
        data = _http_multipart(
            f"{self.base_url}/sendVoice",
            fields=fields,
            file_field="voice",
            file_path=audio_path,
            timeout=90,
        )
        if not data.get("ok"):
            description = data.get("description", "Unbekannter Telegram-Fehler")
            raise RuntimeError(description)
        return data.get("result")


class KumpelBot:
    def __init__(self, token, telegram=None):
        self.telegram = telegram or Telegram(token)
        self.histories = {}
        self.offset = 0
        self.voice_error_logged = False

    def reply(self, chat_id, text):
        self.telegram.send_message(chat_id, text)
        if not TTS_ENABLED:
            return
        audio_path = None
        try:
            audio_path = synthesize_voice(text)
            self.telegram.send_voice(chat_id, audio_path)
        except Exception as exc:
            if not self.voice_error_logged:
                print(f"Deutsche Sprachausgabe nicht verfügbar: {exc}", flush=True)
                self.voice_error_logged = True
        finally:
            if audio_path is not None:
                audio_path.unlink(missing_ok=True)

    def run(self):
        try:
            self.telegram.call(
                "setMyCommands",
                commands=[
                    {"command": "skills", "description": "Fähigkeiten auflisten"},
                    {"command": "skill", "description": "Fähigkeiteninfo anzeigen"},
                    {"command": "status", "description": "WebUI-Status prüfen"},
                    {"command": "reset", "description": "Gespräch zurücksetzen"},
                    {"command": "help", "description": "Hilfe anzeigen"},
                ],
                http_timeout=20,
            )
        except Exception as exc:
            print(f"Befehlsmenü konnte nicht gesetzt werden: {exc}", flush=True)

        print("Kumpel-Bot läuft. Beenden mit Strg+C.", flush=True)
        while True:
            try:
                updates = self.telegram.call(
                    "getUpdates",
                    offset=self.offset,
                    timeout=30,
                    allowed_updates=["message"],
                    http_timeout=45,
                )
            except KeyboardInterrupt:
                raise
            except Exception as exc:
                print(f"Telegram-Polling fehlgeschlagen: {exc}", flush=True)
                time.sleep(5)
                continue

            for update in updates or []:
                self.offset = max(self.offset, int(update.get("update_id", 0)) + 1)
                try:
                    self.handle_update(update)
                except Exception as exc:
                    print(f"Update konnte nicht verarbeitet werden: {exc}", flush=True)

    def handle_update(self, update):
        message = update.get("message") or {}
        text = (message.get("text") or "").strip()
        chat_id = (message.get("chat") or {}).get("id")
        if not chat_id or not text:
            return
        if text.startswith("/"):
            self.handle_command(chat_id, text)
        else:
            self.handle_chat(chat_id, text)

    def handle_command(self, chat_id, text):
        parts = text.split(maxsplit=1)
        command = parts[0].split("@", 1)[0].lower()
        argument = parts[1].strip() if len(parts) > 1 else ""

        if command in {"/start", "/help"}:
            self.reply(chat_id, self.help_text())
        elif command == "/skills":
            namen = skills_liste()
            if namen:
                self.reply(
                    chat_id, "Verfügbare Skills:\n" + "\n".join(f"- {name}" for name in namen)
                )
            else:
                self.reply(chat_id, skills_info())
        elif command == "/skill":
            self.reply(chat_id, skills_info(argument or None))
        elif command == "/status":
            self.reply(chat_id, self.status_text())
        elif command == "/reset":
            self.histories.pop(chat_id, None)
            self.reply(chat_id, "Gespräch zurückgesetzt.")
        else:
            self.reply(
                chat_id, f"Unbekannter Befehl: {command}\n\n{self.help_text()}"
            )

    def handle_chat(self, chat_id, text):
        try:
            self.telegram.call(
                "sendChatAction", chat_id=chat_id, action="typing", http_timeout=15
            )
        except Exception:
            pass

        history = self.histories.setdefault(chat_id, [])
        recent = history[-MAX_HISTORY:] if MAX_HISTORY > 0 else []
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(recent)
        messages.append({"role": "user", "content": text})

        try:
            answer = openwebui_chat(messages)
        except Exception as exc:
            self.reply(
                chat_id,
                f"OpenWebUI antwortet nicht: {exc}\n\n{self.status_text()}",
            )
            return

        history.extend(
            [{"role": "user", "content": text}, {"role": "assistant", "content": answer}]
        )
        if len(history) > MAX_HISTORY:
            del history[: len(history) - MAX_HISTORY]
        self.reply(chat_id, answer)

    def status_text(self):
        model = OPENWEBUI_MODEL or _resolved_model or "automatisch"
        return f"{openwebui_status()}\nModell: {model}"

    def help_text(self):
        return (
            "Ich bin Kumpel, dein KI-Bot.\n\n"
            "Schreib mir einfach eine Nachricht, um mit OpenWebUI zu chatten.\n"
            "Jede Antwort wird zusätzlich als deutsche Sprachnachricht gesendet.\n\n"
            "Befehle:\n"
            "/skills - Fähigkeiten auflisten\n"
            "/skill <name> - Fähigkeiteninfo anzeigen\n"
            "/status - WebUI-Status prüfen\n"
            "/reset - Gespräch zurücksetzen\n"
            "/help - diese Hilfe anzeigen"
        )


def event_loop():
    if TELEGRAM_BOT_TOKEN:
        KumpelBot(TELEGRAM_BOT_TOKEN).run()
        return
    while True:
        print(openwebui_status(), flush=True)
        time.sleep(300)


def check():
    print("Skills:", ", ".join(skills_liste()) or "keine")
    print()
    print(skills_info())
    print()
    print(openwebui_status())


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="KI-Kumpel Telegram-Bot mit Skills und OpenWebUI-Anbindung"
    )
    parser.add_argument("--check", action="store_true", help="Skills und OpenWebUI prüfen")
    parser.add_argument("--chat", metavar="TEXT", help="Einmalig mit OpenWebUI chatten")
    args = parser.parse_args(argv)

    if args.check:
        check()
        return 0

    if args.chat:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": args.chat},
        ]
        try:
            print(openwebui_chat(messages))
        except Exception as exc:
            print(f"Fehler: {exc}", file=sys.stderr)
            return 1
        return 0

    if not TELEGRAM_BOT_TOKEN:
        parser.print_help()
        print(
            "\nTELEGRAM_BOT_TOKEN ist nicht gesetzt. "
            "Setze die Variable, um den Bot zu starten.",
            file=sys.stderr,
        )
        return 2

    try:
        KumpelBot(TELEGRAM_BOT_TOKEN).run()
    except KeyboardInterrupt:
        print("\nBot beendet.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
