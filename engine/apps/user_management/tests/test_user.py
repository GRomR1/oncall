import pytest

from apps.api.permissions import RBACPermission


@pytest.mark.django_db
def test_self_or_admin(
    make_organization,
    make_user_for_organization,
):
    organization = make_organization()
    admin = make_user_for_organization(organization)
    second_admin = make_user_for_organization(organization)
    editor = make_user_for_organization(organization, [RBACPermission.Permissions.USER_SETTINGS_WRITE])

    another_organization = make_organization()
    admin_from_another_organization = make_user_for_organization(another_organization)

    assert admin.self_or_admin(admin, organization) is True
    assert admin.self_or_admin(editor, organization) is False
    assert admin.self_or_admin(second_admin, organization) is True
    assert admin.self_or_admin(admin_from_another_organization, organization) is False
