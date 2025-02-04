from rest_framework import serializers
from rest_framework.authtoken.models import Token


class ExpiringAuthTokenSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Token
        fields = ('key',)
