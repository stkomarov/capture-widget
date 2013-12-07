/**
 * Created by steve on 12/6/13.
 */
    // Returns true if this Internet Explorer 10 or greater running on a device
    // with msPointer events enabled (like the surface pro)
//TODO make an object
function ie10_tablet_pointer() {
    var ie10 = /MSIE (\d+)/.exec(navigator.userAgent)

    if (ie10 != null) {

        version = parseInt(ie10[1])
        if (version >= 10) {
            ie10 = true
        }
        else {
            ie10 = false
        }
    }
    else {
        ie10 = false
    }

    var pointer = navigator.msPointerEnabled ? true : false

    if (ie10 && pointer) {
        return true
    }
    else {
        return false
    }
}