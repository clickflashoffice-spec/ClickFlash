import time
import threading
import paho.mqtt.client as mqtt
from loguru import logger
from typing import Callable

class MQTTTrigger:
    def __init__(self, broker_url: str = "mqtt.eclipseprojects.io", broker_port: int = 1883, topic: str = "clickflash/ride/trigger"):
        self.broker_url = broker_url
        self.broker_port = broker_port
        self.topic = topic
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.trigger_callback = None
        self.cooldown = 0
        self.COOLDOWN_SECONDS = 3
        
        # Setup callbacks
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

    def start(self, trigger_callback: Callable):
        self.trigger_callback = trigger_callback
        
        def connect_and_loop():
            try:
                logger.info(f"Connecting to MQTT broker at {self.broker_url}:{self.broker_port}")
                self.client.connect(self.broker_url, self.broker_port, 60)
                self.client.loop_forever()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
                
        threading.Thread(target=connect_and_loop, daemon=True).start()
        
        # Cooldown management thread
        def manage_cooldown():
            while True:
                if self.cooldown > 0:
                    self.cooldown -= 1
                time.sleep(1)
                
        threading.Thread(target=manage_cooldown, daemon=True).start()

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            logger.success(f"Connected to MQTT broker. Subscribing to {self.topic}")
            self.client.subscribe(self.topic)
        else:
            logger.error(f"Failed to connect to MQTT broker, return code {reason_code}")

    def _on_message(self, client, userdata, msg):
        payload = msg.payload.decode()
        logger.info(f"MQTT Message received on {msg.topic}: {payload}")
        
        if self.cooldown == 0:
            if self.trigger_callback:
                logger.warning("HARDWARE LASER TRIGGER: Firing DSLR via callback!")
                # Start callback in a new thread so we don't block the MQTT loop
                threading.Thread(target=self.trigger_callback).start()
                self.cooldown = self.COOLDOWN_SECONDS
        else:
            logger.info(f"Ignoring trigger, in cooldown mode ({self.cooldown}s remaining)")
