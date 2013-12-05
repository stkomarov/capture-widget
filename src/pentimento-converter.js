/**
 * Created by steve on 12/4/13.
 */

//    function norm_time(curves) {
//
//        if (curves.length > 0) {
//            time_zero = curves[0][0][2]
//            for (i = 0; i < curves.length; i++) {
//                for (j = 0; j < curves[i].length; j++) {
//                    curves[i][j][2] -= time_zero
//                }
//            }
//        }
//        return curves
//    }

    function export_recording_to_pentimento_format(){

        console.log('start export to pentimento')
        var canvas_height = $(canvas_id).height()
        var canvas_width = $(canvas_id).width()

        var result = {
            pageFlips: undefined,
            visuals: undefined,
            cameraTransforms: undefined,
            height: canvas_height,
            width: canvas_width,
            durationInSeconds: (recording_stop_time - recording_start_time)/1000
        }


        //pageFlips
        result.pageFlips = []
        result.pageFlips[0] = {
            page: 1,
            time: -100000.0
        }

        //cameraTransforms
        result.cameraTransforms=[]
        result.cameraTransforms[0] = {
            tx: 0.0,
            ty: 0.0,
            m21: 0.0,
            m22: 1.0,
            m11: 1.0,
            m12: 0.0,
            time: -100.0
        }

//        result.cameraTransforms[1] = {
//            tx: 0.0,
//            ty: 0.0,
//            m21: 0.0,
//            m22: 1.0,
//            m11: 1.0,
//            m12: 0.0,
//            time: 3.0
//        }
//
//        result.cameraTransforms[2] = {
//            tx: 100.0,
//            ty: 0.0,
//            m21: 0.0,
//            m22: 1.0,
//            m11: 1.0,
//            m12: 0.0,
//            time: 4.1
//        }
//
//         result.cameraTransforms[3] = {
//            tx: 0.0,
//            ty: 0.0,
//            m21: 0.0,
//            m22: 1.0,
//            m11: 1.0,
//            m12: 0.0,
//            time: 6.0
//        }
//         result.cameraTransforms[4] = {
//            tx: 100.0,
//            ty: 0.0,
//            m21: 0.0,
//            m22: 1.0,
//            m11: 1.0,
//            m12: 0.0,
//            time: 8.0
//        }
        for (var i=0; i<TRANSFORMS.length; i++){
            var tr = {
                tx: TRANSFORMS[i].dx,
                ty: - TRANSFORMS[i].dy,
                m12: TRANSFORMS[i].m12,
                m21: TRANSFORMS[i].m21,
                m11: TRANSFORMS[i].m11,
                m22: TRANSFORMS[i].m22,
                time: (TRANSFORMS[i].time - recording_start_time)/1000
            }

            result.cameraTransforms.push(tr);
        }


        //visuals
        result.visuals = []


        for (var i=0; i<VISUALS.length; i++){
            if (VISUALS[i].type == VisualTypes.stroke){

                var v = {}
                v.type = 'stroke'
                v.tDeletion = 0
                v.tMin = (VISUALS[i].vertices[0].t - recording_start_time)/1000
                var nverts = VISUALS[i].vertices.length
                v.tEndEdit = (VISUALS[i].vertices[nverts-1].t - recording_start_time)/1000
                v.doesItGetDeleted = false
                v.properties = []
                v.properties[0] = {
                    red: 0,
                    green: 0,
                    blue: 0,
                    alpha: 1,
                    redFill: 0,
                    blueFill: 0,
                    greenFill: 0,
                    alphaFill: 1,
                    thickness: 10,
                    time: v.tEndEdit - v.tMin,
                    type: 'basicProperty'
                }

                v.vertices = []
                for (var j=0; j<VISUALS[i].vertices.length; j++){

                    var vertex = {
                        x: VISUALS[i].vertices[j].x,
                        y: canvas_height - VISUALS[i].vertices[j].y,
                        t: (VISUALS[i].vertices[j].t - recording_start_time)/1000,
                        pressure: (VISUALS[i].vertices[j].pressure == undefined)? 0.8 : VISUALS[i].vertices[j].pressure
                    }

                    v.vertices.push(vertex)
                }

                result.visuals.push(v)
            }
            else {
                console.log('skipping unsupported pentimento visual type: ' + visual.type)
            }
        }

        console.log('end export to pentimento')
        return result
    }