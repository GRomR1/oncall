import typing

import pytest
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSetMixin

from . import (
    Actions,
    GrafanaPermission,
    HasRBACPermissions,
    IsOwner,
    IsOwnerOrHasRBACPermissions,
    RBACObjectPermissionsAttribute,
    RBACPermission,
    RBACPermissionsAttribute,
    Resources,
    _generate_permission_string,
    _get_view_action,
    has_permissions,
)


class MockedUser:
    def __init__(self, permissions: typing.List[GrafanaPermission]) -> None:
        self.permissions = permissions


class MockedSchedule:
    def __init__(self, user: MockedUser) -> None:
        self.user = user


class MockedRequest:
    def __init__(self, user: typing.Optional[MockedUser] = None, method: typing.Optional[str] = None) -> None:
        if user:
            self.user = user
        if method:
            self.method = method


class MockedViewSet(ViewSetMixin):
    def __init__(
        self,
        action: str,
        rbac_permissions: typing.Optional[RBACPermissionsAttribute] = None,
        rbac_object_permissions: typing.Optional[RBACObjectPermissionsAttribute] = None,
    ) -> None:
        super().__init__()
        self.action = action

        if rbac_permissions:
            self.rbac_permissions = rbac_permissions
        if rbac_object_permissions:
            self.rbac_object_permissions = rbac_object_permissions


class MockedAPIView(APIView):
    def __init__(
        self,
        rbac_permissions: typing.Optional[RBACPermissionsAttribute] = None,
        rbac_object_permissions: typing.Optional[RBACObjectPermissionsAttribute] = None,
    ) -> None:
        super().__init__()

        if rbac_permissions:
            self.rbac_permissions = rbac_permissions
        if rbac_object_permissions:
            self.rbac_object_permissions = rbac_object_permissions


def test_generate_permission_string() -> None:
    resource = Resources.ALERT_GROUPS
    action = Actions.WRITE
    suffix = f"{resource.value}:{action.value}"

    assert _generate_permission_string(resource, action) == f"grafana-oncall-app.{suffix}"
    assert _generate_permission_string(resource, action, True) == suffix


def test_get_view_action() -> None:
    viewset_action = "viewset_action"
    viewset = MockedViewSet(viewset_action)

    apiview = MockedAPIView()

    method = "APIVIEW_ACTION"
    request = MockedRequest(method=method)

    assert _get_view_action(request, viewset) == viewset_action, "it works with a ViewSet"
    assert _get_view_action(request, apiview) == method.lower(), "it works with an APIView"


@pytest.mark.parametrize(
    "user_permissions,required_permissions,expected_result",
    [
        (
            [GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_READ.value)],
            [RBACPermission.Permissions.ALERT_GROUPS_READ],
            True,
        ),
        (
            [
                GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_READ.value),
                GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_WRITE.value),
            ],
            [RBACPermission.Permissions.ALERT_GROUPS_READ, RBACPermission.Permissions.ALERT_GROUPS_WRITE],
            True,
        ),
        (
            [GrafanaPermission(action=RBACPermission.Permissions.TESTING.value)],
            [RBACPermission.Permissions.ALERT_GROUPS_READ],
            False,
        ),
        (
            [
                GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_READ.value),
            ],
            [RBACPermission.Permissions.ALERT_GROUPS_READ, RBACPermission.Permissions.ALERT_GROUPS_WRITE],
            False,
        ),
    ],
)
def test_has_permissions(user_permissions, required_permissions, expected_result) -> None:
    assert has_permissions(user_permissions, required_permissions) == expected_result


class TestRBACPermission:
    def test_has_permission_works_on_a_viewset_view(self) -> None:
        required_permission = RBACPermission.Permissions.ALERT_GROUPS_READ

        action = "hello"
        viewset = MockedViewSet(
            action=action,
            rbac_permissions={
                action: [required_permission],
            },
        )

        viewset_with_no_required_permissions = MockedViewSet(
            action=action,
            rbac_permissions={
                action: [],
            },
        )

        user_with_permission = MockedUser(
            [
                GrafanaPermission(action=required_permission.value),
            ]
        )
        user_without_permission = MockedUser(
            [
                GrafanaPermission(action=RBACPermission.Permissions.TESTING.value),
            ]
        )

        assert (
            RBACPermission().has_permission(MockedRequest(user_with_permission), viewset) is True
        ), "it works on a viewset when the user does have permission"

        assert (
            RBACPermission().has_permission(MockedRequest(user_without_permission), viewset) is False
        ), "it works on a viewset when the user does have permission"

        assert (
            RBACPermission().has_permission(
                MockedRequest(user_without_permission), viewset_with_no_required_permissions
            )
            is True
        ), "it works on a viewset when the viewset action does not require permissions"

    def test_has_permission_works_on_an_apiview_view(self) -> None:
        required_permission = RBACPermission.Permissions.ALERT_GROUPS_READ

        method = "hello"
        apiview = MockedAPIView(
            rbac_permissions={
                method: [required_permission],
            }
        )
        apiview_with_no_permissions = MockedAPIView(
            rbac_permissions={
                method: [],
            }
        )

        user1 = MockedUser(
            [
                GrafanaPermission(action=required_permission.value),
            ]
        )
        user2 = MockedUser(
            [
                GrafanaPermission(action=RBACPermission.Permissions.TESTING.value),
            ]
        )

        class Request(MockedRequest):
            def __init__(self, user: typing.Optional[MockedUser] = None) -> None:
                super().__init__(user, method)

        assert (
            RBACPermission().has_permission(Request(user1), apiview) is True
        ), "it works on an APIView when the user has permission"

        assert (
            RBACPermission().has_permission(Request(user2), apiview) is False
        ), "it works on an APIView when the user does not have permission"

        assert (
            RBACPermission().has_permission(Request(user2), apiview_with_no_permissions) is True
        ), "it works on a viewset when the viewset action does not require permissions"

    def test_has_permission_throws_assertion_error_if_developer_forgets_to_specify_rbac_permissions(self) -> None:
        action_slash_method = "hello"

        viewset = MockedViewSet(action_slash_method)
        apiview = MockedAPIView()

        with pytest.raises(AssertionError):
            RBACPermission().has_permission(MockedRequest(), viewset)

        with pytest.raises(AssertionError):
            RBACPermission().has_permission(MockedRequest(method=action_slash_method), apiview)

    def test_has_object_permission_returns_true_if_rbac_object_permissions_not_specified(self) -> None:
        request = MockedRequest()
        assert RBACPermission().has_object_permission(request, MockedAPIView(), None) is True
        assert RBACPermission().has_object_permission(request, MockedViewSet("potato"), None) is True

    def test_has_object_permission_works_if_no_permission_class_specified_for_action(self) -> None:
        action = "hello"

        request = MockedRequest(None, action)
        apiview = MockedAPIView(rbac_object_permissions={})
        viewset = MockedViewSet(action, rbac_object_permissions={})

        assert RBACPermission().has_object_permission(request, apiview, None) is True
        assert RBACPermission().has_object_permission(request, viewset, None) is True

    def test_has_object_permission_works_when_permission_class_specified_for_action(self) -> None:
        action = "hello"
        mocked_permission_class_response = "asdfasdfasdf"

        class MockedPermissionClass:
            def has_object_permission(self, _req, _view, _obj) -> None:
                return mocked_permission_class_response

        rbac_object_permissions = {MockedPermissionClass(): (action,)}
        request = MockedRequest(None, action)
        apiview = MockedAPIView(rbac_object_permissions=rbac_object_permissions)
        viewset = MockedViewSet(action, rbac_object_permissions=rbac_object_permissions)

        assert RBACPermission().has_object_permission(request, apiview, None) == mocked_permission_class_response
        assert RBACPermission().has_object_permission(request, viewset, None) == mocked_permission_class_response


class TestIsOwner:
    def test_it_works_when_comparing_user_to_object(self) -> None:
        user1 = MockedUser([])
        user2 = MockedUser([])
        request = MockedRequest(user1)
        IsUser = IsOwner()

        assert IsUser.has_object_permission(request, None, user1) is True
        assert IsUser.has_object_permission(request, None, user2) is False

    def test_it_works_when_comparing_user_to_ownership_field_object(self) -> None:
        user1 = MockedUser([])
        user2 = MockedUser([])
        schedule = MockedSchedule(user1)
        IsScheduleOwner = IsOwner("user")

        assert IsScheduleOwner.has_object_permission(MockedRequest(user1), None, schedule) is True
        assert IsScheduleOwner.has_object_permission(MockedRequest(user2), None, schedule) is False

    def test_it_works_when_comparing_user_to_nested_ownership_field_object(self) -> None:
        class Thingy:
            def __init__(self, schedule: MockedSchedule) -> None:
                self.schedule = schedule

        user1 = MockedUser([])
        user2 = MockedUser([])
        schedule = MockedSchedule(user1)
        thingy = Thingy(schedule)
        IsScheduleOwner = IsOwner("schedule.user")

        assert IsScheduleOwner.has_object_permission(MockedRequest(user1), None, thingy) is True
        assert IsScheduleOwner.has_object_permission(MockedRequest(user2), None, thingy) is False


@pytest.mark.parametrize(
    "user_permissions,required_permissions,expected_result",
    [
        (
            [GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_READ.value)],
            [RBACPermission.Permissions.ALERT_GROUPS_READ],
            True,
        ),
        (
            [
                GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_READ.value),
                GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_WRITE.value),
            ],
            [RBACPermission.Permissions.ALERT_GROUPS_READ, RBACPermission.Permissions.ALERT_GROUPS_WRITE],
            True,
        ),
        (
            [GrafanaPermission(action=RBACPermission.Permissions.TESTING.value)],
            [RBACPermission.Permissions.ALERT_GROUPS_READ],
            False,
        ),
        (
            [
                GrafanaPermission(action=RBACPermission.Permissions.ALERT_GROUPS_READ.value),
            ],
            [RBACPermission.Permissions.ALERT_GROUPS_READ, RBACPermission.Permissions.ALERT_GROUPS_WRITE],
            False,
        ),
    ],
)
def test_HasRBACPermission(user_permissions, required_permissions, expected_result) -> None:
    request = MockedRequest(MockedUser(user_permissions))
    assert HasRBACPermissions(required_permissions).has_object_permission(request, None, None) == expected_result


class TestIsOwnerOrHasRBACPermissions:
    required_permission = RBACPermission.Permissions.SCHEDULES_READ
    required_permissions = [required_permission]
    required_user_permissions = [GrafanaPermission(action=required_permission.value)]

    def test_it_works_when_user_is_owner_and_does_not_have_permissions(self) -> None:
        user1 = MockedUser([])
        schedule = MockedSchedule(user1)
        request = MockedRequest(user1)

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions)
        assert PermClass.has_object_permission(request, None, user1) is True

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions, "user")
        assert PermClass.has_object_permission(request, None, schedule) is True

    def test_it_works_when_user_is_owner_and_has_permissions(self) -> None:
        user1 = MockedUser(self.required_user_permissions)
        schedule = MockedSchedule(user1)
        request = MockedRequest(user1)

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions)
        assert PermClass.has_object_permission(request, None, user1) is True

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions, "user")
        assert PermClass.has_object_permission(request, None, schedule) is True

    def test_it_works_when_user_is_not_owner_and_does_not_have_permissions(self) -> None:
        user1 = MockedUser([])
        user2 = MockedUser([])
        schedule = MockedSchedule(user1)
        request = MockedRequest(user2)

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions)
        assert PermClass.has_object_permission(request, None, user1) is False

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions, "user")
        assert PermClass.has_object_permission(request, None, schedule) is False

    def test_it_works_when_user_is_not_owner_and_has_permissions(self) -> None:
        user1 = MockedUser([])
        user2 = MockedUser(self.required_user_permissions)
        schedule = MockedSchedule(user1)
        request = MockedRequest(user2)

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions)
        assert PermClass.has_object_permission(request, None, user1) is True

        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions, "user")
        assert PermClass.has_object_permission(request, None, schedule) is True

        class Thingy:
            def __init__(self, schedule: MockedSchedule) -> None:
                self.schedule = schedule

        thingy = Thingy(schedule)
        PermClass = IsOwnerOrHasRBACPermissions(self.required_permissions, "schedule.user")

        assert PermClass.has_object_permission(request, None, thingy) is True
        assert PermClass.has_object_permission(MockedRequest(MockedUser([])), None, thingy) is False
