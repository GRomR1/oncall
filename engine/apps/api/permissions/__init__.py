import enum
import typing

from rest_framework import permissions
from rest_framework.authentication import BasicAuthentication, SessionAuthentication
from rest_framework.request import Request
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet, ViewSetMixin

from common.utils import getattrd

ACTION_PREFIX = "grafana-oncall-app"
RBAC_PERMISSIONS_ATTR = "rbac_permissions"
RBAC_OBJECT_PERMISSIONS_ATTR = "rbac_object_permissions"

ViewSetOrAPIView = typing.Union[ViewSet, APIView]


class GrafanaPermission(typing.TypedDict):
    action: str


class Resources(enum.Enum):
    ALERT_GROUPS = "alert-groups"
    INTEGRATIONS = "integrations"
    ESCALATION_CHAINS = "escalation-chains"
    SCHEDULES = "schedules"
    CHATOPS = "chatops"
    OUTGOING_WEBHOOKS = "outgoing-webhooks"
    MAINTENANCE = "maintenance"
    API_KEYS = "api-keys"

    NOTIFICATION_SETTINGS = "notification-settings"
    USER_SETTINGS = "user-settings"
    OTHER_SETTINGS = "other-settings"

    _IMPOSSIBLE_TESTING = "impossible-testing"


class Actions(enum.Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

    _IMPOSSIBLE_TESTING = "impossible-testing"


def _generate_permission_string(resource: Resources, action: Actions, ignore_prefix=False) -> str:
    with_prefix = f"{ACTION_PREFIX}."
    return f"{'' if ignore_prefix else with_prefix}{resource.value}:{action.value}"


def _get_view_action(request: Request, view: ViewSetOrAPIView) -> str:
    """
    For right now this needs to support being used in both a ViewSet as well as APIView, we use both interchangably

    Note: `request.method` is returned uppercase
    """
    return view.action if isinstance(view, ViewSetMixin) else request.method.lower()


class RBACPermission(permissions.BasePermission):
    class Permissions(enum.Enum):
        ALERT_GROUPS_READ = _generate_permission_string(Resources.ALERT_GROUPS, Actions.READ)
        ALERT_GROUPS_WRITE = _generate_permission_string(Resources.ALERT_GROUPS, Actions.WRITE)

        INTEGRATIONS_READ = _generate_permission_string(Resources.INTEGRATIONS, Actions.READ)
        INTEGRATIONS_WRITE = _generate_permission_string(Resources.INTEGRATIONS, Actions.WRITE)

        ESCALATION_CHAINS_READ = _generate_permission_string(Resources.ESCALATION_CHAINS, Actions.READ)
        ESCALATION_CHAINS_WRITE = _generate_permission_string(Resources.ESCALATION_CHAINS, Actions.WRITE)

        SCHEDULES_READ = _generate_permission_string(Resources.SCHEDULES, Actions.READ)
        SCHEDULES_WRITE = _generate_permission_string(Resources.SCHEDULES, Actions.WRITE)

        CHATOPS_READ = _generate_permission_string(Resources.CHATOPS, Actions.READ)
        CHATOPS_WRITE = _generate_permission_string(Resources.CHATOPS, Actions.WRITE)

        OUTGOING_WEBHOOKS_READ = _generate_permission_string(Resources.OUTGOING_WEBHOOKS, Actions.READ)
        OUTGOING_WEBHOOKS_WRITE = _generate_permission_string(Resources.OUTGOING_WEBHOOKS, Actions.WRITE)

        MAINTENANCE_READ = _generate_permission_string(Resources.MAINTENANCE, Actions.READ)
        MAINTENANCE_WRITE = _generate_permission_string(Resources.MAINTENANCE, Actions.WRITE)

        API_KEYS_READ = _generate_permission_string(Resources.API_KEYS, Actions.READ)
        API_KEYS_WRITE = _generate_permission_string(Resources.API_KEYS, Actions.WRITE)

        NOTIFICATION_SETTINGS_READ = _generate_permission_string(Resources.NOTIFICATION_SETTINGS, Actions.READ)
        NOTIFICATION_SETTINGS_WRITE = _generate_permission_string(Resources.NOTIFICATION_SETTINGS, Actions.WRITE)

        USER_SETTINGS_READ = _generate_permission_string(Resources.USER_SETTINGS, Actions.READ)
        USER_SETTINGS_WRITE = _generate_permission_string(Resources.USER_SETTINGS, Actions.WRITE)
        USER_SETTINGS_ADMIN = _generate_permission_string(Resources.USER_SETTINGS, Actions.ADMIN)

        OTHER_SETTINGS_READ = _generate_permission_string(Resources.OTHER_SETTINGS, Actions.READ)
        OTHER_SETTINGS_WRITE = _generate_permission_string(Resources.OTHER_SETTINGS, Actions.WRITE)

        TESTING = _generate_permission_string(Resources._IMPOSSIBLE_TESTING, Actions._IMPOSSIBLE_TESTING)

    def has_permission(self, request: Request, view: ViewSetOrAPIView) -> bool:
        action = _get_view_action(request, view)

        rbac_permissions: RBACPermissionsAttribute = getattr(view, RBAC_PERMISSIONS_ATTR, None)

        assert (
            rbac_permissions is not None
        ), f"Must define a {RBAC_PERMISSIONS_ATTR} dict on the ViewSet that is consuming the RBACPermission class"

        return has_permissions(request.user.permissions, rbac_permissions.get(action, []))

    def has_object_permission(self, request: Request, view: ViewSetOrAPIView, obj: typing.Any) -> bool:
        rbac_object_permissions: RBACObjectPermissionsAttribute = getattr(view, RBAC_OBJECT_PERMISSIONS_ATTR, None)

        if rbac_object_permissions:
            action = _get_view_action(request, view)

            for PermissionClass, actions in rbac_object_permissions.items():
                if action in actions:
                    return PermissionClass.has_object_permission(request, view, obj)
            return False

        # has_object_permission is called after has_permission, so return True if in view there is not
        # RBAC_OBJECT_PERMISSIONS_ATTR attr which mean no additional check involving object required
        return True


def has_permissions(
    user_permissions: typing.List[GrafanaPermission], required_permissions: typing.List[RBACPermission.Permissions]
) -> bool:
    user_has_all_required_permissions = True

    for required_permission in required_permissions:
        granted_permission: typing.Union[None, GrafanaPermission] = None

        for user_permission in user_permissions:
            if user_permission["action"] == required_permission.value:
                granted_permission = user_permission
                break

        if granted_permission is None:
            user_has_all_required_permissions = False
            break

    return user_has_all_required_permissions


class IsOwner(permissions.BasePermission):
    def __init__(self, ownership_field: typing.Optional[str] = None) -> None:
        self.ownership_field = ownership_field

    def has_object_permission(self, request: Request, _view: ViewSet, obj: typing.Any) -> bool:
        owner = obj if self.ownership_field is None else getattrd(obj, self.ownership_field)
        return owner == request.user


class HasRBACPermissions(permissions.BasePermission):
    def __init__(self, required_permissions: typing.List[RBACPermission.Permissions]) -> None:
        self.required_permissions = required_permissions

    def has_object_permission(self, request: Request, _view: ViewSetOrAPIView, _obj: typing.Any) -> bool:
        return has_permissions(request.user.permissions, self.required_permissions)


class IsOwnerOrHasRBACPermissions(permissions.BasePermission):
    def __init__(
        self,
        required_permissions: typing.List[RBACPermission.Permissions],
        ownership_field: typing.Optional[str] = None,
    ) -> None:
        self.IsOwner = IsOwner(ownership_field)
        self.HasRBACPermissions = HasRBACPermissions(required_permissions)

    def has_object_permission(self, request: Request, view: ViewSetOrAPIView, obj: typing.Any) -> bool:
        return self.IsOwner.has_object_permission(request, view, obj) or self.HasRBACPermissions.has_object_permission(
            request, view, obj
        )


class IsStaff(permissions.BasePermission):
    STAFF_AUTH_CLASSES = [BasicAuthentication, SessionAuthentication]

    def has_permission(self, request: Request, _view: ViewSet) -> bool:
        user = request.user
        if not any(isinstance(request._authenticator, x) for x in self.STAFF_AUTH_CLASSES):
            return False
        if user and user.is_authenticated:
            return user.is_staff
        return False


RBACPermissionsAttribute = typing.Dict[str, typing.List[RBACPermission.Permissions]]
RBACObjectPermissionsAttribute = typing.Dict[permissions.BasePermission, typing.List[str]]

ALL_PERMISSIONS = [
    permission for permission in RBACPermission.Permissions if permission != RBACPermission.Permissions.TESTING
]
