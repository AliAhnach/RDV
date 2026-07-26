from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / 'pages' / 'login.html',
    ROOT / 'pages' / 'appointments.html',
    ROOT / 'assets' / 'js' / 'auth.service.js',
    ROOT / 'assets' / 'js' / 'dashboard.init.js',
    ROOT / 'assets' / 'js' / 'appointments.js',
    ROOT / 'assets' / 'js' / 'main.js',
    ROOT / 'assets' / 'js' / 'i18n.js',
    ROOT / 'assets' / 'css' / 'auth.css',
    ROOT / 'assets' / 'css' / 'appointments.css',
    ROOT / 'README.md',
]

FORBIDDEN = [
    'continuerEnInvite',
    'mode invité',
    'mode guest',
    'guest.banner',
    'guest.cta',
    'guest-divider',
    'guest-btn',
    'modal-guest',
    'guest-modal',
    'Invité',
    'isGuest',
]


def main() -> int:
    failures = []
    for path in TARGETS:
        if not path.exists():
            failures.append(f'Missing file: {path.relative_to(ROOT)}')
            continue
        text = path.read_text(encoding='utf-8')
        for token in FORBIDDEN:
            if token in text:
                failures.append(f'{path.relative_to(ROOT)} contains forbidden token: {token}')
    if failures:
        print('\n'.join(failures))
        return 1
    print('No guest-mode references found in targeted files.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
