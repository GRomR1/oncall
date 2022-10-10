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
def test_subscription_retrieve_permissions(
    make_organization_and_user_with_plugin_token,
    make_user_auth_headers,
    permissions,
    expected_status,
):
    _, user, token = make_organization_and_user_with_plugin_token(permissions)
    client = APIClient()

    url = reverse("api-internal:subscription")
    with patch(
        "apps.api.views.subscription.SubscriptionView.get",
        return_value=Response(
            status=status.HTTP_200_OK,
        ),
    ):
        response = client.get(url, format="json", **make_user_auth_headers(user, token))

    assert response.status_code == expected_status
