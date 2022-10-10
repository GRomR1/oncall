from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.api.permissions import RBACPermission

# TODO: should maybe add rbac permissions tests for
# SetGeneralChannel.post


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        # any authenticated user should have permission, regardless of permissions...
        ([], status.HTTP_200_OK),
    ],
)
def test_current_team_retrieve_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, tester, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:api-current-team")
    with patch(
        "apps.api.views.organization.CurrentOrganizationView.get",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.get(url, format="json", **make_user_auth_headers(tester, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        ([RBACPermission.Permissions.OTHER_SETTINGS_WRITE], status.HTTP_200_OK),
        ([RBACPermission.Permissions.OTHER_SETTINGS_READ], status.HTTP_403_FORBIDDEN),
        ([RBACPermission.Permissions.TESTING], status.HTTP_403_FORBIDDEN),
    ],
)
def test_current_team_update_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, tester, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:api-current-team")

    with patch(
        "apps.api.views.organization.CurrentOrganizationView.put",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.put(url, format="json", **make_user_auth_headers(tester, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        ([RBACPermission.Permissions.CHATOPS_READ], status.HTTP_200_OK),
        ([RBACPermission.Permissions.CHATOPS_WRITE], status.HTTP_403_FORBIDDEN),
        ([RBACPermission.Permissions.TESTING], status.HTTP_403_FORBIDDEN),
    ],
)
def test_current_team_get_telegram_verification_code_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, tester, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:api-get-telegram-verification-code")
    response = client.get(url, format="json", **make_user_auth_headers(tester, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        ([RBACPermission.Permissions.CHATOPS_READ], status.HTTP_200_OK),
        ([RBACPermission.Permissions.CHATOPS_WRITE], status.HTTP_403_FORBIDDEN),
        ([RBACPermission.Permissions.TESTING], status.HTTP_403_FORBIDDEN),
    ],
)
def test_current_team_get_channel_verification_code_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, tester, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:api-get-channel-verification-code") + "?backend=TESTONLY"
    response = client.get(url, format="json", **make_user_auth_headers(tester, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
def test_current_team_get_channel_verification_code_ok(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
):
    organization, tester, token = make_organization_and_user_with_plugin_token()
    client = APIClient()

    url = reverse("api-internal:api-get-channel-verification-code") + "?backend=TESTONLY"
    with patch(
        "apps.base.tests.messaging_backend.TestOnlyBackend.generate_channel_verification_code",
        return_value="the-code",
    ) as mock_generate_code:
        response = client.get(url, format="json", **make_user_auth_headers(tester, token))

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == "the-code"
    mock_generate_code.assert_called_once_with(organization)


@pytest.mark.django_db
def test_current_team_get_channel_verification_code_invalid(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
):
    _, tester, token = make_organization_and_user_with_plugin_token()
    client = APIClient()

    url = reverse("api-internal:api-get-channel-verification-code") + "?backend=INVALID"
    response = client.get(url, format="json", **make_user_auth_headers(tester, token))

    assert response.status_code == status.HTTP_400_BAD_REQUEST
