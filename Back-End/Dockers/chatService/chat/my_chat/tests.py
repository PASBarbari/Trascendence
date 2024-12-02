from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from chat.asgi import application
from asgiref.sync import sync_to_async

class ChatTests(TransactionTestCase):
    async def test_websocket_connection(self):
        # Create a mock user using sync_to_async
        User = get_user_model()
        user = await sync_to_async(User.objects.create_user)(username='testuser', password='password')

        # Define the headers
        headers = [(b'origin', b'http://localhost')]

        # Create the WebsocketCommunicator with the URL path and headers
        communicator = WebsocketCommunicator(application, "/ws/chat/room_1/", headers=headers)

        # Set the user in the scope
        communicator.scope['user'] = user

        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)

        await communicator.send_json_to({'message': 'Hello, WebSocket!', 'room_id': 'room_1', 'sender': 'testuser', 'timestamp': '2021-01-01T00:00:00Z'})
        response = await communicator.receive_json_from()
        self.assertEqual(response['message'], 'Hello, WebSocket!')

        await communicator.disconnect()