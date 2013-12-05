/*

 An HTML5 canvas for drawing and capturing

 */


function do_line_segments_intersect(segment_a, segment_b){

    var x1 = segment_a.start.x
    var y1 = segment_a.start.y
    var x2 = segment_a.end.x
    var y2 = segment_a.end.y

    var x3 = segment_b.start.x
    var y3 = segment_b.start.y
    var x4 = segment_b.end.x
    var y4 = segment_b.end.y


   var d = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
   if (d == 0) {return false};

   var xi = ((x3-x4)*(x1*y2-y1*x2)-(x1-x2)*(x3*y4-y3*x4))/d;
   var yi = ((y3-y4)*(x1*y2-y1*x2)-(y1-y2)*(x3*y4-y3*x4))/d;


   if (xi < Math.min(x1,x2) || xi > Math.max(x1,x2)){return false};
   if (xi < Math.min(x3,x4) || xi > Math.max(x3,x4)){return false};
   if (yi < Math.min(y1,y2) || yi > Math.max(y1,y2)){return false};
   if (yi < Math.min(y3,y4) || yi > Math.max(y3,y4)){return false};

   return true;
}

// get a timestamp
function time() {
    var d = new Date();
    return d.getTime();
}

// paint_widget encapsulates drawing primitives for HTML5 canvas
function paint_widget(canvas_id){

    var canvas_id = canvas_id
    var default_line_color = '#333'
    var default_line_width = 2
    var default_point_color = '#222'

    // a c e          m11  m21  dx         m11  m21  dx     x
    // b d f          m12  m22  dy         m12  m22  dy     y
    // 0 0 1           0    0   1          0    0   1       1

    var current_transform = {
            m11: 1,  //a
            m12: 0,  //b
            m21: 0,  //c
            m22: 1,  //d
            dx: 0,  //e
            dy: 0   //f
     }


    function partial_matrix_multiply(A,B){

        var C = {
            m11: A.m11 * B.m11 + A.m21* B.m12,
            m21: A.m11 * B.m21 + A.m21* B.m22,
            m12: A.m12 * B.m11 + A.m22* B.m12,
            m22: A.m12 * B.m21 + A.m22* B.m22,
            dx: A.m11* B.dx + A.m21* B.dy + A.dx,
            dy: A.m12* B.dx + A.m22* B.dy + A.dy,
        }

        return C;
    }

    function partial_matrix_inverse(A){

         var inv ={

            m11: A.m22/(A.m11* A.m22- A.m12* A.m21),  //a
            m21: A.m21/(A.m12* A.m21- A.m11* A.m22),  //b
            m12: A.m12/(A.m12* A.m21- A.m11* A.m22),  //c
            m22: A.m11/(A.m11* A.m22- A.m12* A.m21),  //d
            dx: (A.m22* A.dx- A.m21* A.dy)/(A.m12* A.m21- A.m11* A.m22),  //e
            dy: (A.m12* A.dx- A.m11* A.dy)/(A.m11* A.m22- A.m12* A.m21)   //f
        }
        return inv;
    }

    function partial_vector_multiply(A,b){

        // b = {x,y}

        var transformed_b = {
            x: A.m11* b.x + A.m21* b.y+ A.dx,
            y: A.m12* b.x + A.m22* b.y+ A.dy
        }

        return transformed_b;
    }

    function get_ctx() {
        return $(canvas_id).get(0).getContext('2d'); // todo replace with static ctx?
    }

     this.draw_line = function(line) {
         /*
            line = {
                from: point,
                to: point,
                color: string  // optional
                width: int    // optional
            }
          */
        var ctx = get_ctx()
        ctx.beginPath();
        ctx.moveTo(line.from.x, line.from.y);
        ctx.lineTo(line.to.x, line.to.y);

        ctx.strokeStyle = (line.color == undefined) ? default_line_color : line.color
        ctx.lineWidth = (line.width == undefined) ? default_line_width : line.width
        ctx.lineCap = 'round'

        ctx.stroke();
    }

    this.draw_point = function(coord) {
        var ctx = get_ctx()
        ctx.beginPath();
        ctx.fillStyle = default_point_color
        ctx.fillRect(coord.x - 1, coord.y - 1, 3, 3)
    }

    this.clear = function(){
        var ctx = get_ctx()
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(-100, -100, $(canvas_id).width()+100, $(canvas_id).height()+100)
        ctx.restore();
    }

    this.relative_point = function(event){
        var pt = {
            x: event.pageX - $(canvas_id).offset().left, // todo fix if canvas not in corner
            y: event.pageY - $(canvas_id).offset().top,
        }

        var inv = partial_matrix_inverse(current_transform)
        pt = partial_vector_multiply(inv,pt)

        pt.t = time()
        return pt
    }




    this.resize_canvas = function() {
        var iw = $(window).width();
        var ih = $(window).height();

        $(canvas_id)[0].width = 0.6 * iw
        $(canvas_id)[0].height = 0.6 * ih
    }

    this.get_ctx = get_ctx;

    this.transform = function(mat) {
        var ctx = get_ctx();

        current_transform = partial_matrix_multiply(current_transform, mat);

        ctx.setTransform(current_transform.m11, current_transform.m12, current_transform.m21, current_transform.m22, current_transform.dx, current_transform.dy)
    }

    this.get_current_transform = function(){
        return current_transform;
    }
}

// smart_paint_widget wraps paint_widget to modify the drawing primitives
// according to advanced input such as pressure
function smart_paint_widget(canvas_id){

    var canvas = new paint_widget(canvas_id)
    var pressure_color = false  // Change color of strokes dep on pressure?
    var pressure_width = true  // Change width of strokes dep on pressure?
    var max_extra_line_width = 4

    this.draw_line = function(line) {

        /*
            line = {
               from: point,
               to: point,
               ...
            }
         */

        avg_pressure = 0.5 * (line.from.pressure + line.to.pressure)

        if (pressure_color) {
            alpha = (1 - 0.5) + 0.5 * avg_pressure
            line.color = 'rgba(32,32,32,' + alpha + ')' // todo use defaults
        }
        else {
            line.color = 'rgba(64,64,64,1)'  // todo use defaults
        }

        if (pressure_width) {
            line.width = 1 + Math.round(max_extra_line_width * avg_pressure) // todo use defaults
        }
        else {
            line.width = 2 // todo use defaults
        }

        canvas.draw_line(line)
    }

    this.relative_point = function(event){
        pt = canvas.relative_point(event)
        pt.pressure  = event.pressure
        return pt
    }

    this.draw_point = canvas.draw_point
    this.clear = canvas.clear
    this.resize_canvas = canvas.resize_canvas
    this.get_ctx = canvas.get_ctx;
    this.transform = canvas.transform;
    this.get_current_transform = canvas.get_current_transform;
}


/* *****************************************************************************
 *  capture_widget captures and displays input
 * ****************************************************************************/

function capture_widget(init){

    var canvas_dom_id = init.canvas_id
    var canvas_id = '#' + canvas_dom_id
    //var canvas // drawing widget
    canvas = ''

    var recording_start_time;
    var recording_stop_time;
    var is_recording = false;

    var LMB = 1;
    var MMB = 2;
    var RMB = 3;

    var MS_POINTER_TOUCH = 2;
    var MS_POINTER_PEN = 3;

    var lmb_down = false
    var inline = false
    var last_point;

    var pan_last_point;

    var VisualTypes = {
        dots: 'dots',  // todo use ints to speed up?
        stroke: 'stroke',
        eraser: 'eraser'
    }
    var active_visual_type = VisualTypes['stroke']


    var PEN = false // pointer enabled device


    var VISUALS = []
    var current_visual;

    var TRANSFORMS = []

    function empty_visual(){
        return {
            type: '',
            doesItGetDeleted: false,
            tDeletion: 0,
            tEndEdit: 0,
            tMin: 0,
            properties:[],
            vertices:[]
        }
    }

    function on_mousedown(event) {
        event.preventDefault()
        if (! is_recording){return;}

        if(PEN && event.pointerType == MS_POINTER_TOUCH)
        {
            return on_pan_start(event);
        }

        if(event.which == MMB){
            return on_pan_start(event);
        }


        lmb_down = true
        inline = true

        current_visual = empty_visual()
        current_visual.type = active_visual_type
        last_point = canvas.relative_point(event)

        current_visual.vertices.push(last_point)

        if (active_visual_type == VisualTypes.dots) {
            canvas.draw_point(last_point)
        }

    }
    function on_mousemove(event) {
        event.preventDefault()
        if (! is_recording){return;}

        if(PEN && event.pointerType == MS_POINTER_TOUCH){
            return on_pan_move(event);
        }

        if(event.which == MMB){
            return on_pan_move(event);
        }



        if (lmb_down) {
            cur_point = canvas.relative_point(event)

            if (active_visual_type == VisualTypes.dots) {
                canvas.draw_point(cur_point)
            }
            else if (active_visual_type == VisualTypes.stroke) {
                canvas.draw_line({
                        from: cur_point,
                        to: last_point
                    })
            }
            else if (active_visual_type == VisualTypes.eraser){

                return on_erase_move(last_point,cur_point);
            }
            else {
                alert("unknown drawing mode")
            }

            last_point = cur_point
            current_visual.vertices.push(last_point)
        }

    }
    function on_mouseup(event) {
        event.preventDefault()
        if (! is_recording){return;}

        if(PEN && event.pointerType == MS_POINTER_TOUCH){
            return on_pan_end(event);
        }
        if(event.which == MMB){
            return;
        }


        if (lmb_down) {

            if (active_visual_type != VisualTypes.eraser) {
                console.log('push')
                VISUALS.push(current_visual)
            }
        }

        lmb_down = false
        inline = false

        //console.log('mouseup')

    }

    function on_erase_move(last_point, cur_point) {

        var at_least_one_intersection = false;
        for (var i = 0; i < VISUALS.length; i++) {

            for (var j = 0; j < VISUALS[i].vertices.length - 1; j++) {
                var segment_a = {
                    start: last_point,
                    end: cur_point
                }
                var segment_b = {
                    start: VISUALS[i].vertices[j],
                    end: VISUALS[i].vertices[j + 1]
                }
                if (do_line_segments_intersect(segment_a, segment_b)) {



                    VISUALS[i].doesItGetDeleted = true;
                    VISUALS[i].tDeletion = time();
                    at_least_one_intersection = true;
                }
            }
        }

        if(at_least_one_intersection){
            canvas.clear()
            draw_visuals(VISUALS)
        }

    }

    function on_pan_start(event){
        pan_last_point = {x: event.pageX, y:event.pageY};
    }

    function translation_matrix(dx,dy){

        // a c e          m11  m21  dx
        // b d f          m12  m22  dy
        // 0 0 1           0    0   1

        return {
            m11: 1,  //a
            m12: 0,  //b
            m21: 0,  //c
            m22: 1,  //d
            dx: dx,  //e
            dy: dy   //f
        }
    }

    function on_pan_move(event){
        if((time() - pan_last_point.t) < 50){
            return;
        }
        var cur_point = {x: event.pageX, y:event.pageY};

        var dx = cur_point.x - pan_last_point.x;
        var dy = cur_point.y - pan_last_point.y;

        var mat = translation_matrix(dx,dy);
        //var ctx = canvas.get_ctx();
        //ctx.save()
        //canvas.transform(mat)
        canvas.clear();
        canvas.transform(mat)
        //ctx.translate(dx,dy);
        draw_visuals(VISUALS)
        //ctx.restore();

        var transform = canvas.get_current_transform()
        transform.time = time()
        TRANSFORMS.push(transform)

        pan_last_point = cur_point;




        //console.log('panning', canvas.relative_point(event))
    }

    function on_pan_end(event){

        return on_pan_move(event);
    }



    function draw_visuals(visuals){
        for (var i=0; i<visuals.length; i++){
            var visual = visuals[i]

            if(visual.doesItGetDeleted){
                continue;
            }

            if (visual.type == VisualTypes.dots){
                for(var j=0; j<visual.vertices.length; j++){
                    var vertex = visual.vertices[j]
                    canvas.draw_point(vertex)
                }
            }
            else if(visual.type == VisualTypes.stroke){
                for(var j=1; j<visual.vertices.length; j++){
                    var from = visual.vertices[j-1]
                    var to = visual.vertices[j]
                    var line = {
                        from: from,
                        to: to
                    }
                    canvas.draw_line(line)
                }
            }
            else {
                console.log('unknown visual type', visual.type)
            }
        }
    }






    // Returns true if this Internet Explorer 10 or greater running on a device
    // with msPointer events enabled (like the surface pro)
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


    // Initialize the widget (this function is called right after it is defined)
    function widget_init() {

        PEN = ie10_tablet_pointer()

        if (PEN) {
            console.log('Pointer Enabled Device')
            canvas = new smart_paint_widget(canvas_id)

            c = document.getElementById(canvas_dom_id);
            c.addEventListener("MSPointerUp", on_mouseup, false);
            c.addEventListener("MSPointerMove", on_mousemove, false);
            c.addEventListener("MSPointerDown", on_mousedown, false);



        }
        else {
            console.log('Pointer Disabled Device')
            canvas = new paint_widget(canvas_id)
            $(canvas_id).mousedown(on_mousedown)
            $(canvas_id).mousemove(on_mousemove)
            $(window).mouseup(on_mouseup)
        }


        //$(window).resize(resize_canvas)

        /*
         //ignore touch events for now
         canvas = $("#canv")[0]
         canvas.addEventListener('touchstart', on_mousedown, false);
         canvas.addEventListener('touchmove', on_mousemove, false);
         window.addEventListener('touchend', on_mouseup, false);

         */

       canvas.resize_canvas();
    }

    //Initialize the widget
    widget_init()

    /* *************************************************************************
     *  Public Methods
     * *************************************************************************/


    // Erases the entire canvas
    this.clear = function(){
        canvas.clear()
    }

    // Starts recording of strokes
    this.start_collecting = function() {

    }

    // Stops recording of strokes and prints them
    this.stop_collecting = function(){

    }

    // Change the interpolation mode
    this.set_active_visual_type = function(type_str){
        active_visual_type = VisualTypes[type_str]
    }

    this.draw_all=function(){
        draw_visuals(VISUALS)
    }

    this.undo=function(){

        if(VISUALS.length > 0){
            VISUALS.pop()
            canvas.clear()
            draw_visuals(VISUALS)
        }

    }

//    this.get_recording = function(){
//        var pentimento_record = export_recording_to_pentimento_format()
//        return pentimento_record
//    }

    this.start_recording = function (){
        is_recording = true;
        recording_start_time = time();
    }

    this.stop_recording = function(){
        is_recording = false;
        recording_stop_time = time();
    }

}


