import unittest

if not hasattr(unittest.TestCase, 'enterClassContext'):
    @classmethod
    def enterClassContext(cls, context):
        return context
    unittest.TestCase.enterClassContext = enterClassContext
    
    @classmethod
    def enterContext(cls, context):
        return context
    unittest.TestCase.enterContext = enterContext
