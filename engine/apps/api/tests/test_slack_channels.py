from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        # any authenticated user should have permission, regardless of permissions...
        ([], status.HTTP_200_OK),
    ],
)
def test_slack_channels_list_permissions(
    make_organization_and_user_with_plugin_token, make_user_auth_headers, permissions, expected_status
):
    _, user, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:slack_channel-list")

    response = client.get(url, format="json", **make_user_auth_headers(user, token))
    with patch(
        "apps.api.views.slack_channel.SlackChannelView.list",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        assert response.status_code == expected_status


@pytest.mark.django_db
@pytest.mark.parametrize(
    "permissions,expected_status",
    [
        # any authenticated user should have permission, regardless of permissions...
        ([], status.HTTP_200_OK),
    ],
)
def test_slack_channels_detail_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    make_slack_channel,
    permissions,
    expected_status,
):
    organization, user, token = make_organization_and_user_with_plugin_token(permissions)
    slack_channel = make_slack_channel(organization.slack_team_identity)
    client = APIClient()

    url = reverse("api-internal:slack_channel-detail", kwargs={"pk": slack_channel.public_primary_key})

    response = client.get(url, format="json", **make_user_auth_headers(user, token))
    with patch(
        "apps.api.views.slack_channel.SlackChannelView.retrieve",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        assert response.status_code == expected_status
