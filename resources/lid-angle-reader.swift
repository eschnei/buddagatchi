import Foundation
import IOKit.hid

let noOptions = IOOptionBits(kIOHIDOptionsTypeNone)

func readLidAngle() -> Int? {
    let manager = IOHIDManagerCreate(kCFAllocatorDefault, noOptions)
    guard IOHIDManagerOpen(manager, noOptions) == kIOReturnSuccess else { return nil }
    defer { IOHIDManagerClose(manager, noOptions) }

    let matching: [String: Any] = [
        kIOHIDVendorIDKey as String: 0x05AC,
        kIOHIDProductIDKey as String: 0x8104,
    ]
    IOHIDManagerSetDeviceMatching(manager, matching as CFDictionary)

    guard let devices = IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice> else { return nil }

    for device in devices {
        let usagePage = IOHIDDeviceGetProperty(device, kIOHIDPrimaryUsagePageKey as CFString) as? Int ?? 0
        guard usagePage == 0x0020 else { continue }
        guard IOHIDDeviceOpen(device, noOptions) == kIOReturnSuccess else { continue }
        defer { IOHIDDeviceClose(device, noOptions) }

        var report = [UInt8](repeating: 0, count: 8)
        var length = CFIndex(report.count)
        let result = IOHIDDeviceGetReport(device, kIOHIDReportTypeFeature, 1, &report, &length)
        guard result == kIOReturnSuccess, length >= 3 else { continue }

        return Int(UInt16(report[2]) << 8 | UInt16(report[1]))
    }
    return nil
}

let pollMode = CommandLine.arguments.contains("--poll")

if pollMode {
    while true {
        if let angle = readLidAngle() {
            print(angle)
            fflush(stdout)
        }
        Thread.sleep(forTimeInterval: 0.5)
    }
} else {
    if let angle = readLidAngle() {
        print(angle)
    } else {
        fputs("NO_SENSOR\n", stderr)
        exit(1)
    }
}
