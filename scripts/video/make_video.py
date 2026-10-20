"""Explainer video (English): scenes rendered by headless Chrome + macOS `say` voice-over, assembled by ffmpeg.

Usage (dev server running: ./scripts/serve.sh):
    python3 -I scripts/video/make_video.py
Output: docs/video/accueil-plus.mp4   (working files in build/video/, ignored by git)
"""
import json, os, shutil, subprocess, sys, tempfile, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORK = os.path.join(ROOT, "build", "video")
OUT = os.path.join(ROOT, "docs", "video", "accueil-plus.mp4")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
FFPROBE = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
BASE = "http://localhost:%s/scripts/video/slide.html" % os.environ.get("PORT", "8765")
VOICE, RATE = "Samantha", "172"
NAME = "Ah-coy Plus"  # phonetic spelling of "Accueil+" for the English voice

SCENES = [
    dict(kind="card", k="Samsung · LG", t="Accueil+", s="A premium home screen for your TV",
         say="This is %s: an Apple TV inspired home screen for Samsung and LG TVs." % NAME),
    dict(kind="shot", img="accueil", t="All your services in one place", s="Streaming, cloud gaming and music, driven by the remote",
         say="Netflix, Prime Video, Disney Plus, Canal Plus, Crunchyroll, and your cloud games. All on one screen, controlled entirely with the remote."),
    dict(kind="shot", img="streaming", t="A cinematic spotlight", s="Popular titles in France, with artwork and synopsis from TMDB",
         say="The selected tile shows what's popular on that service in France, with full screen artwork, a logo, and a short synopsis, powered by T M D B."),
    dict(kind="shot", img="jeux", t="Resume in one click", s="Your last game service, plus the game you're playing",
         say="For games, the Resume tile reopens the last service you played on, like Xbox, Luna, or GeForce Now. You can also note the game you're currently playing."),
    dict(kind="shot", img="non-detectee", t="Always honest", s="Missing apps are explained, never faked",
         say="If an app isn't installed, %s says so, and explains how to get it. It never pretends to launch anything." % NAME),
    dict(kind="shot", img="toutes", t="Every app on your TV", s="Detected automatically, in alphabetical order",
         say="Every app installed on the TV is listed in one place."),
    dict(kind="shot", img="reglages", t="Your settings", s="No account, no ads, no tracking",
         say="Choose to start on the home screen, or right where you left off. There's no account, no ads, and no tracking."),
    dict(kind="card", k="Install", t="One command", l="# Samsung|./scripts/install.sh|# LG|./scripts/install-lg.sh",
         say="Installing takes a single command, on Samsung, or on L G."),
    dict(kind="card", t="Accueil+", s="github.com/estebanbaigts/TV-hub",
         say="The code is on GitHub. Enjoy your new home screen!"),
]
PAD, FADE, FPS = 0.9, 0.35, 30


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def duration(path):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
                         check=True, capture_output=True, text=True).stdout
    return float(json.loads(out)["format"]["duration"])


def main():
    shutil.rmtree(WORK, ignore_errors=True)
    os.makedirs(WORK)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    profile = tempfile.mkdtemp()
    clips = []
    try:
        for i, sc in enumerate(SCENES):
            png, aiff, clip = [os.path.join(WORK, "%02d.%s" % (i, e)) for e in ("png", "aiff", "mp4")]
            params = {k: v for k, v in sc.items() if k in ("kind", "t", "s", "k", "l")}
            if sc.get("img"):
                params["img"] = "../../docs/captures/%s.png" % sc["img"]
            url = BASE + "#" + "&".join("%s=%s" % (k, urllib.parse.quote(v, safe="")) for k, v in params.items())
            run([CHROME, "--headless=new", "--user-data-dir=" + profile, "--hide-scrollbars", "--window-size=1920,1080",
                 "--virtual-time-budget=3000", "--screenshot=" + png, url])
            run(["say", "-v", VOICE, "-r", RATE, "-o", aiff, sc["say"]])
            d = duration(aiff) + PAD
            run([FFMPEG, "-y", "-loop", "1", "-framerate", str(FPS), "-t", "%.2f" % d, "-i", png, "-i", aiff,
                 "-filter_complex",
                 "[0:v]format=yuv420p,fade=t=in:st=0:d=%s,fade=t=out:st=%.2f:d=%s[v];[1:a]adelay=250|250,apad,aresample=48000[a]"
                 % (FADE, d - FADE, FADE),
                 "-map", "[v]", "-map", "[a]", "-t", "%.2f" % d, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                 "-c:a", "aac", "-b:a", "160k", "-ac", "2", clip])
            clips.append(clip)
            print("scene %d/%d  %.1fs  %s" % (i + 1, len(SCENES), d, sc["t"]))
        lst = os.path.join(WORK, "list.txt")
        with open(lst, "w") as f:
            f.writelines("file '%s'\n" % c for c in clips)
        run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", OUT])
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    print("OK : %s  (%.0f s, %.1f Mo)" % (os.path.relpath(OUT, ROOT), duration(OUT), os.path.getsize(OUT) / 1e6))


if __name__ == "__main__":
    sys.exit(main())
