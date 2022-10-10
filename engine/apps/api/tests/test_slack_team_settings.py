from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.api.permissions import RBACPermission


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        ([RBACPermission.Permissions.CHATOPS_READ], status.HTTP_200_OK),
        ([RBACPermission.Permissions.CHATOPS_WRITE], status.HTTP_403_FORBIDDEN),
        ([RBACPermission.Permissions.TESTING], status.HTTP_403_FORBIDDEN),
    ],
)
def test_get_slack_settings_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, user, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:slack-settings")
    with patch(
        "apps.api.views.slack_team_settings.SlackTeamSettingsAPIView.get",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.get(url, format="json", **make_user_auth_headers(user, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        ([RBACPermission.Permissions.CHATOPS_WRITE], status.HTTP_200_OK),
        ([RBACPermission.Permissions.CHATOPS_READ], status.HTTP_403_FORBIDDEN),
        ([RBACPermission.Permissions.TESTING], status.HTTP_403_FORBIDDEN),
    ],
)
def test_update_slack_settings_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, user, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:slack-settings")
    with patch(
        "apps.api.views.slack_team_settings.SlackTeamSettingsAPIView.put",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.put(url, format="json", **make_user_auth_headers(user, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        # any authenticated user should have permission, regardless of permissions...
        ([], status.HTTP_200_OK),
    ],
)
def test_get_acknowledge_remind_options_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, user, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:acknowledge-reminder-options")
    with patch(
        "apps.api.views.slack_team_settings.AcknowledgeReminderOptionsAPIView.get",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.get(url, format="json", **make_user_auth_headers(user, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        # any authenticated user should have permission, regardless of permissions...
        ([], status.HTTP_200_OK),
    ],
)
def test_get_unacknowledge_timeout_options_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, user, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:unacknowledge-timeout-options")
    with patch(
        "apps.api.views.slack_team_settings.UnAcknowledgeTimeoutOptionsAPIView.get",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.get(url, format="json", **make_user_auth_headers(user, token))

    assert response.status_code == expected_status


@pytest.mark.django_db
def test_get_slack_settings(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
):
    organization, user, token = make_organization_and_user_with_plugin_token()
    client = APIClient()

    expected_payload = {
        "pk": organization.public_primary_key,
        "acknowledge_remind_timeout": 0,
        "unacknowledge_timeout": 0,
    }

    url = reverse("api-internal:slack-settings")
    response = client.get(url, format="json", **make_user_auth_headers(user, token))

    assert response.status_code == status.HTTP_200_OK
    assert response.data == expected_payload


@pytest.mark.django_db
def test_put_slack_settings(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
):
    organization, user, token = make_organization_and_user_with_plugin_token()
    client = APIClient()

    expected_payload = {
        "pk": organization.public_primary_key,
        "acknowledge_remind_timeout": 0,
        "unacknowledge_timeout": 0,
    }

    data_to_update = {
        "acknowledge_remind_timeout": 1,
        "unacknowledge_timeout": 1,
    }

    url = reverse("api-internal:slack-settings")
    response = client.get(url, format="json", **make_user_auth_headers(user, token))

    assert response.data == expected_payload

    response = client.put(url, data=data_to_update, format="json", **make_user_auth_headers(user, token))
    expected_payload.update(data_to_update)

    assert response.status_code == status.HTTP_200_OK
    assert response.data == expected_payload
