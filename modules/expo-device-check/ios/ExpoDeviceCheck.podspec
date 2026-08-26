Pod::Spec.new do |s|
  s.name           = 'ExpoDeviceCheck'
  s.version        = '1.0.0'
  s.summary        = 'Minimal DeviceCheck token bridge for Unumae'
  s.description    = 'Exposes the opaque Apple DeviceCheck token used by the server-side pool binding policy.'
  s.author         = 'Unumae'
  s.homepage       = 'https://unumae.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'DeviceCheck'
  s.swift_version  = '5.9'
  s.source_files   = '**/*.{h,m,mm,swift}'
end
