from abc import ABC, abstractmethod

class BaseNotificationProvider(ABC):
    @abstractmethod
    def send(self, notification, user, company, branch=None):
        pass
