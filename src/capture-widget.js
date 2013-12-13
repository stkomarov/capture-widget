/*

 An HTML5 canvas for drawing and capturing

 */


//TODO major refactor use self instead of this

function bb_visual(visual){

    var min_x = visual.vertices[0].x;
    var min_y = visual.vertices[0].y;

    for(var i=0; i<visual.vertices.length; i++){
        if(visual.vertices[i].x < min_x){
            min_x = visual.vertices[i].x
        }

        if(visual.vertices[i].y < min_y){
            min_y = visual.vertices[i].y
        }
    }

    return {
        min_x: min_x,
        min_y: min_y
    }
}

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
function paint_widget(init){


    var canvas_id = init.canvas_id


//    var canvas_width = typeof(init.canvas_width)== 'undefined'? '100' : init.canvas_width
//    var canvas_height = typeof(init.canvas_height)== 'undefined'? '100' : init.canvas_height

    var default_line_color = '#333'
    var default_line_width = init.line_width;
//    console.log('init line width:', init.line_width)
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

        ctx.strokeStyle = (typeof line.color !== 'undefined') ? line.color: default_line_color
        ctx.lineWidth = (typeof line.width !== 'undefined') ? line.width: default_line_width

//         console.log('line width: ',ctx.lineWidth )
//         console.log('line style: ',ctx.strokeStyle )

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

//
//        $(canvas_id)[0].width = canvas_width
//        $(canvas_id)[0].height = canvas_height

//        $(canvas_id).attr('width', canvas_width)
//        $(canvas_id).attr('height', canvas_height)
    }

    this.get_ctx = get_ctx;

    this.transform = function(mat) {
        var ctx = get_ctx();

        current_transform = partial_matrix_multiply(current_transform, mat);

        ctx.setTransform(current_transform.m11, current_transform.m12, current_transform.m21, current_transform.m22, current_transform.dx, current_transform.dy)
    }

	this.get_image_data_rgba = function(){
        var ctx = get_ctx();
        var width = $(canvas_id).width()
        var height = $(canvas_id).height()

        return ctx.getImageData(0,0,width,height);		
	}

    this.get_current_transform = function(){
        return current_transform;
    }
}

// smart_paint_widget wraps paint_widget to modify the drawing primitives
// according to advanced input such as pressure
function smart_paint_widget(init){

    var canvas = new paint_widget(init)
    var pressure_color = false  // Change color of strokes dep on pressure?
    var pressure_width = true  // Change width of strokes dep on pressure?
    var max_extra_line_width = init.line_width

    var base_line_width = init.line_width;

    this.draw_line = function(line) {

        /*
            line = {
               from: point,
               to: point,
               ...
            }
         */

        avg_pressure = 0.5 * (line.from.pressure + line.to.pressure)

        if(typeof(line.color) === 'undefined'){
            if (pressure_color) {
                alpha = (1 - 0.5) + 0.5 * avg_pressure
                line.color = 'rgba(32,32,32,' + alpha + ')' // todo use defaults
            }
            else {
                line.color = 'rgba(64,64,64,1)'  // todo use defaults
            }
        }


        if(typeof (line.width) === 'undefined'){
            if (pressure_width) {
                line.width = base_line_width + Math.round(max_extra_line_width * avg_pressure) // todo use defaults

            }
            else {
                line.width = base_line_width // todo use defaults
            }
        }



//        console.log('li: ', line.width)
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
    this.get_image_data_rgba = canvas.get_image_data_rgba;
}


/* *****************************************************************************
 *  capture_widget captures and displays input
 * ****************************************************************************/

function capture_widget(init){
    var self= this;
    self.canvas_dom_id = init.canvas_id

    self.canvas_id = '#' + self.canvas_dom_id

    if (typeof init.smart_widget === 'undefined'){
        init.smart_widget = true;
    }
    self.gesture_support = (init.gesture_support||false);
    self.GestureWidget = {}; // Initialized externally if gesture sypport

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

    var canvas;


    self.canvas = new Object();


    var VisualTypes = {
        dots: 'dots',  // todo use ints to speed up?
        stroke: 'stroke',
        eraser: 'eraser',
        highlight: 'highlight'
    }
    var active_visual_type = VisualTypes['stroke']


    var PEN = false // pointer enabled device


    self.visuals = []
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
        last_point = self.canvas.relative_point(event)

        current_visual.vertices.push(last_point)

        if (active_visual_type == VisualTypes.dots) {
            self.canvas.draw_point(last_point)
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
            cur_point = self.canvas.relative_point(event)

            if (active_visual_type == VisualTypes.dots) {
                self.canvas.draw_point(cur_point)
            }
            else if (active_visual_type == VisualTypes.stroke) {
                self.canvas.draw_line({
                        from: cur_point,
                        to: last_point
                    })
            }
            else if (active_visual_type == VisualTypes.eraser){

                return on_erase_move(last_point,cur_point);
            }
            else if(active_visual_type == VisualTypes.highlight){
                return on_highlight_move(last_point,cur_point);
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



            if (active_visual_type == VisualTypes.stroke) {

                //TODO rmeove
                if(ApplicationVM.is_touch_available){
                    current_visual.finger_count = ApplicationVM.last_number_of_fingers_down();
                }

                if(self.gesture_support){
                    var stroke = {
                        vertices: current_visual.vertices,
                        finger_count: current_visual.finger_count //TODO not always necessary
                    }

                    var classification = self.GestureWidget.is_stroke_gesture(stroke);

                    if(classification.is_gesture){
                        console.log('is gesture')
                        self.clear()
                        draw_visuals(self.visuals)

                        if(classification.action == 'Erase'){
                            on_demand_erase(stroke);
                        }
                        else if(classification.action == 'Highlight'){
                            on_demand_highlight(stroke);
                        }
                        else if(classification.action.substring(0, 'user'.length) === 'user'){

                            var strokes = GM.get_action_by_name(classification.action).strokes;
//                            console.log('StrokeS', strokes);

                            var bb = bb_visual(current_visual);
//                            console.log('bb', bb);

                            var strokes = JSON.parse(JSON.stringify(strokes));

                            for(var i=0; i<strokes.length; i++){
                                for (var j=0; j<strokes[i].vertices.length; j++){
                                    strokes[i].vertices[j].x += (bb.min_x-50);
                                    strokes[i].vertices[j].y += (bb.min_y-50);
                                }
                            }


                            for (var i=0; i<strokes.length; i++){
                                self.save_draw_stroke(strokes[i], false);
                            }


                        }
                        else{
                            console.log('unknown gesture')
                        }
                    }
                    else{
                        self.visuals.push(current_visual)
                    }

                }
                else{
                    self.visuals.push(current_visual)
                }
            }
        }

        lmb_down = false
        inline = false

        //console.log('mouseup')

    }

    function find_intersecting_visuals_to_line(last_point, cur_point){
        var at_least_one_intersection = false;
        var intersecting_visuals = []
        for (var i = 0; i < self.visuals.length; i++) {

            for (var j = 0; j < self.visuals[i].vertices.length - 1; j++) {
                var segment_a = {
                    start: last_point,
                    end: cur_point
                }
                var segment_b = {
                    start: self.visuals[i].vertices[j],
                    end: self.visuals[i].vertices[j + 1]
                }
                if (do_line_segments_intersect(segment_a, segment_b)) {
                    intersecting_visuals.push(self.visuals[i])
                    at_least_one_intersection = true;
                }
            }
        }

        return {
            intersecting_visuals: intersecting_visuals,
            at_least_one_intersection: at_least_one_intersection
        }
    }

    function on_erase_move(last_point, cur_point) {

        var ix = find_intersecting_visuals_to_line(last_point, cur_point)

        for (var i=0; i<ix.intersecting_visuals.length; i++){

            ix.intersecting_visuals[i].doesItGetDeleted = true;
            ix.intersecting_visuals[i].tDeletion = time();
        }

        if(ix.at_least_one_intersection){
            self.canvas.clear()
            draw_visuals(self.visuals)
        }

    }

     function on_highlight_move(last_point, cur_point) {

//         console.log('on highlight move')
        var ix = find_intersecting_visuals_to_line(last_point, cur_point)

        for (var i=0; i<ix.intersecting_visuals.length; i++){

            if(ix.intersecting_visuals[i].doesItGetDeleted){
                continue;
            }

            var stroke = {
                vertices: ix.intersecting_visuals[i].vertices,
                color: 'rgba(255,165,0,1)',
                width: 6
            }
            self.draw_stroke(stroke);

        }

    }


    function on_demand_erase(stroke){

        console.log('on demand erase')

        for (var i=1; i<stroke.vertices.length; i++){
            var point_a = stroke.vertices[i-1]
            var point_b = stroke.vertices[i]

            on_erase_move(point_a, point_b)
        }
    }

    function on_demand_highlight(stroke){
        console.log('on demand erase')

        for (var i=1; i<stroke.vertices.length; i++){
            var point_a = stroke.vertices[i-1]
            var point_b = stroke.vertices[i]

            on_highlight_move(point_a, point_b)
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
        //var ctx = self.canvas.get_ctx();
        //ctx.save()
        //self.canvas.transform(mat)
        self.canvas.clear();
        self.canvas.transform(mat)
        //ctx.translate(dx,dy);
        draw_visuals(self.visuals)
        //ctx.restore();

        var transform = self.canvas.get_current_transform()
        transform.time = time()
        TRANSFORMS.push(transform)

        pan_last_point = cur_point;




        //console.log('panning', self.canvas.relative_point(event))
    }

    function on_pan_end(event){

        return on_pan_move(event);
    }

    self.save_draw_stroke = function(stroke, preserve_time){
        var preserve_time = (preserve_time || false);

        self.draw_stroke(stroke);

        var cur_time = time();
        var vertices = JSON.parse(JSON.stringify(stroke.vertices))

        if(! preserve_time){
            for (var i=0; i<vertices.length; i++){
                vertices[i].t = cur_time;
            }
        }

        var visual = empty_visual();
        visual.type = VisualTypes.stroke;
        visual.vertices = vertices;

        //TODO remove tainted
        if(ApplicationVM.is_touch_available){
           visual.finger_count = stroke.finger_count;
        }

        self.visuals.push(visual);
    }

    self.draw_stroke = function(stroke){

        for(var j=1; j<stroke.vertices.length; j++){
            var from = stroke.vertices[j-1]
            var to = stroke.vertices[j]
            var line = {
                from: from,
                to: to
            }

            if(typeof stroke.color !== 'undefined'){
                line.color = stroke.color;
            }
            if(typeof stroke.width !== 'undefined'){
                line.width = stroke.width;
            }
            self.canvas.draw_line(line)
        }


    }

    self.get_last_stroke =function(){

        if(self.visuals.length < 1){
            console.log('no stroke to extract')
            return undefined;
        }

        var last_visual = self.visuals[self.visuals.length-1]
        if(last_visual.type != VisualTypes.stroke){
            console.log('cannot extract visual type', last_visual.type)
            return undefined;
        }


        var stroke =  {vertices: last_visual.vertices}

        //TODO tainted
        if(ApplicationVM.is_touch_available){
            stroke.finger_count = last_visual.finger_count;
        }

        return stroke;
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
                    self.canvas.draw_point(vertex)
                    //TODO retime
                }
            }
            else if(visual.type == VisualTypes.stroke){
                self.draw_stroke({vertices: visual.vertices})
            }
            else {
                console.log('unknown visual type', visual.type)
            }
        }
    }

    function bind_handlers(){
        if (PEN) {
            var c = document.getElementById(self.canvas_dom_id);
            c.addEventListener("MSPointerUp", on_mouseup, false);
            c.addEventListener("MSPointerMove", on_mousemove, false);
            c.addEventListener("MSPointerDown", on_mousedown, false);

        }
        else {

            $(self.canvas_id).mousedown(on_mousedown)
            $(self.canvas_id).mousemove(on_mousemove)
            $(window).mouseup(on_mouseup)
        }
    }


    // Initialize the widget (this function is called right after it is defined)
    function widget_init() {

        PEN = ie10_tablet_pointer()

        var canvas_init = {
            canvas_id: self.canvas_id,
            line_width: init.line_width
        }

        if(PEN && init.smart_widget){
            console.log('Pointer Enabled Device')
            self.canvas = new smart_paint_widget(canvas_init)
        }
        else{
            console.log('Pointer Disabled Device')
            self.canvas = new paint_widget(canvas_init)
        }



        bind_handlers();




        //$(window).resize(resize_canvas)

        /*
         //ignore touch events for now
         canvas = $("#canv")[0]
         canvas.addEventListener('touchstart', on_mousedown, false);
         canvas.addEventListener('touchmove', on_mousemove, false);
         window.addEventListener('touchend', on_mouseup, false);

         */

       self.canvas.resize_canvas();
    }

    //Initialize the widget
    widget_init()

    /* *************************************************************************
     *  Public Methods
     * *************************************************************************/


    // Erases the entire self.canvas
    self.clear = function(){
        self.canvas.clear()
    }

    // Starts recording of strokes
    self.start_collecting = function() {

    }

    // Stops recording of strokes and prints them
    self.stop_collecting = function(){

    }

    // Change the interpolation mode
    self.set_active_visual_type = function(type_str){
        active_visual_type = VisualTypes[type_str]
    }

    self.draw_all=function(){
        draw_visuals(self.visuals)
    }

    self.undo=function(){

        if(self.visuals.length > 0){
            self.visuals.pop()
            self.canvas.clear()
            draw_visuals(self.visuals)
        }

    }

//    this.get_recording = function(){
//        var pentimento_record = export_recording_to_pentimento_format()
//        return pentimento_record
//    }

    self.start_recording = function (){
        is_recording = true;
        recording_start_time = time();
    }

    self.stop_recording = function(){
        is_recording = false;
        recording_stop_time = time();
    }

    self.get_image_data_rgba = self.canvas.get_image_data_rgba;

    self.toDataURL =function(){
         var c = document.getElementById(self.canvas_dom_id)
        return c.toDataURL()
    }	

}


