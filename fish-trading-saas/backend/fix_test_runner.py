from django.test.runner import DiscoverRunner
import unittest

class CustomTestRunner(DiscoverRunner):
    def run_suite(self, suite, **kwargs):
        kwargs = self.get_test_runner_kwargs()
        if 'durations' in kwargs:
            del kwargs['durations']
        runner = self.test_runner(**kwargs)
        return runner.run(suite)
