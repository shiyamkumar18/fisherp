import enum
import datetime

# Polyfills for Python 3.10 compatibility
if not hasattr(enum, 'EnumType'):
    enum.EnumType = type(enum.Enum)

if not hasattr(enum, 'StrEnum'):
    class StrEnum(str, enum.Enum):
        pass
    enum.StrEnum = StrEnum

if not hasattr(enum, 'property'):
    enum.property = property

if not hasattr(enum, 'nonmember'):
    class nonmember:
        def __init__(self, value):
            self.value = value
        def __get__(self, instance, owner):
            return self.value
    enum.nonmember = nonmember

if not hasattr(datetime, 'UTC'):
    datetime.UTC = datetime.timezone.utc
