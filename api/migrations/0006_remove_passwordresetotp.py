from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_password_reset_otp"),
    ]

    operations = [
        migrations.DeleteModel(
            name="PasswordResetOTP",
        ),
    ]
