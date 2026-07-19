import { registerWebModule, NativeModule } from 'expo';

class ExpoDslrUsbModule extends NativeModule<{}> {}

export default registerWebModule(ExpoDslrUsbModule, 'ExpoDslrUsbModule');
