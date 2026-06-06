from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_remove_passwordresetotp'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='password_hash',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Hashed password required to view protected note content.',
                max_length=128,
            ),
        ),
    ]
