"""Génère dev/index.html à partir de app/index.html : même page + simulation Tizen + test e2e."""
import os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = open(os.path.join(root, "app", "index.html"), encoding="utf-8").read()
head = '<meta charset="utf-8">'
assert head in src
src = src.replace(head, head + '\n  <!-- GÉNÉRÉ par scripts/make_dev_page.py : ne pas modifier à la main. -->\n  <base href="../app/">', 1)
src = src.replace("<title>TV Hub</title>", "<title>TV Hub (simulation)</title>")
first = '<script src="js/catalog.js"></script>'
assert first in src
src = src.replace(first, '<script src="../dev/tizen-mock.js"></script>\n  <script src="../dev/e2e.js"></script>\n  ' + first, 1)
open(os.path.join(root, "dev", "index.html"), "w", encoding="utf-8").write(src)
print("dev/index.html régénéré")
