import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('promote_image', Path(__file__).with_name('promote-image.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

REPO = 'ghcr.io/ga1dz1/nebel'
OLD = 'sha256:' + 'a' * 64
NEW = 'sha256:' + 'b' * 64


class StableRepairTests(unittest.TestCase):
    def setUp(self):
        self.tags = {'candidate-fix': NEW, '1.5.0': OLD, 'stable': OLD,
                     'latest': OLD, 'testing': OLD}
        self.copies = []

    def runner(self, args):
        if args[:2] == ['skopeo', 'list-tags']:
            return json.dumps({'Tags': list(self.tags)})
        if args[:2] == ['skopeo', 'inspect']:
            ref = args[-1]
            return json.dumps({'Digest': self.tags[ref.rsplit(':', 1)[-1]]})
        if args[:2] == ['skopeo', 'copy']:
            tag = args[-1].rsplit(':', 1)[-1]
            self.tags[tag] = NEW
            self.copies.append(tag)
            return ''
        raise AssertionError(args)

    def promote(self, **options):
        with patch.object(module, 'verify_image', return_value=None):
            return module.promote(REPO, 'candidate-fix', 'stable', '1.5.0', NEW,
                                  'unused.pub', runner=self.runner, **options)

    def test_default_never_replaces_version(self):
        with self.assertRaisesRegex(ValueError, 'refusing overwrite'):
            self.promote()
        self.assertEqual(self.copies, [])

    def test_explicit_repair_checks_old_digest_and_leaves_testing(self):
        self.promote(replace_existing_version=True, expected_previous_digest=OLD)
        self.assertEqual(self.copies, ['1.5.0', 'stable', 'latest'])
        self.assertEqual(self.tags['testing'], OLD)

    def test_moved_stable_stops_before_writes(self):
        self.tags['stable'] = 'sha256:' + 'c' * 64
        with self.assertRaisesRegex(ValueError, 'Stable moved'):
            self.promote(replace_existing_version=True, expected_previous_digest=OLD)
        self.assertEqual(self.copies, [])

    def test_wrong_previous_digest_stops_before_writes(self):
        with self.assertRaisesRegex(ValueError, 'Stable moved'):
            self.promote(replace_existing_version=True,
                         expected_previous_digest='sha256:' + 'c' * 64)
        self.assertEqual(self.copies, [])


if __name__ == '__main__':
    unittest.main()
