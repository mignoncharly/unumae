import DeviceCheck
import ExpoModulesCore

public final class ExpoDeviceCheckModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoDeviceCheck")

    Property("isSupported") {
      DCDevice.current.isSupported
    }

    AsyncFunction("generateTokenAsync") { (promise: Promise) in
      guard DCDevice.current.isSupported else {
        promise.reject("ERR_DEVICE_CHECK_UNSUPPORTED", "DeviceCheck is unavailable on this device")
        return
      }

      DCDevice.current.generateToken { data, error in
        if let error {
          promise.reject("ERR_DEVICE_CHECK_TOKEN", error.localizedDescription)
          return
        }
        guard let data else {
          promise.reject("ERR_DEVICE_CHECK_TOKEN", "DeviceCheck returned no token")
          return
        }
        promise.resolve(data.base64EncodedString())
      }
    }
  }
}
