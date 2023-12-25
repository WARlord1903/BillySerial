const socket = io();

let auton_paths = new Map();
let motors = [];

let selected_waypoint;
let curr_point_index;

let x_pos;
let y_pos;

let load_button = document.querySelector("#load-button");
let auton_list = document.querySelector("#auton-list");
let auton_steps_button = document.querySelector("#auton-steps-button");
let auton_steps = document.querySelector("#auton-steps");

let robot_div = document.querySelector("#robot-div");
let robot = document.querySelector("#robot");
let robot_x_input = document.querySelector("#robot-x-input");
let robot_y_input = document.querySelector("#robot-y-input");
let heading_div = document.querySelector("#heading-div");
let heading_range = document.querySelector("#heading-range");
let heading_input = document.querySelector("#heading-input");

heading_range.min = 0;
heading_range.max = Math.PI * 2;
robot.style.position = "absolute";

let load_file_button = document.querySelector('#load-auton-file');
let save_file_button = document.querySelector('#save-auton-file');
let file_upload = document.querySelector("#file-upload")

let curr_auton_steps = [];
let in_path = false;
let curr_path = "";
let curr_index = 0;

let sliders = document.querySelectorAll(".slider-div");
let waypoint_inputs = document.querySelector("#point-inputs");
let point_div = document.querySelector("#points");
let reversed_div = document.querySelector("#reversed");
let lookahead_div = document.querySelector("#lookahead-inputs");
let old_path_switch_div = document.querySelector("#old-path-switch-div");
let ramsete_inputs = document.querySelector("#ramsete-inputs");

let old_path_switch = document.querySelector("#old-path-switch");
let path_inputs = document.querySelector("#path-inputs");
let x_input = document.querySelector("#x-input");
let y_input = document.querySelector("#y-input");
let min_lookahead_input = document.querySelector("#min-lookahead-input");
let max_lookahead_input = document.querySelector("#max-lookahead-input");
let reversed_input = document.querySelector("#reversed-input");

let intensity_slider = document.querySelector("#intensity-slider");
let angle_text = document.querySelector("#angle");
let linear_text = document.querySelector("#linear-velocity");
let angular_text = document.querySelector("#angular-velocity");

for(let elem of sliders){
    elem.hidden = true;
}

let spacing_slider = document.querySelector("#spacing-slider");
let smoothing_slider = document.querySelector("#smoothing-slider");

spacing_slider.value = 0;
smoothing_slider.value = 0;
intensity_slider.value = 0.1;
old_path_switch.checked = false;

let spacing_label = document.querySelector("#spacing-label");
let smoothing_label = document.querySelector("#smoothing-label");

load_button.onclick = () => {
    auton_paths = new Map();
    motors = [];
    socket.emit("request-auton-paths", "");
    load_button.disabled = true;
}

socket.on("clear-paths", msg => {
    auton_list.innerHTML = "";
});

window.addEventListener("resize", () => {
    if(curr_auton_steps[curr_index] instanceof PurePursuitPath || curr_auton_steps[curr_index] instanceof RamsetePath){
        for(let i = 0; i < curr_auton_steps[curr_index].old_points.length; i++){
            let elem = document.querySelector("#waypoint" + i);
            elem.style.left = ((field.offsetLeft + inches_to_pixels(curr_auton_steps[curr_index].old_points[i].x) - 5)) + "px";
            elem.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(curr_auton_steps[curr_index].old_points[i].y) - 5)) + "px";
        }
    }
    else{
        if(curr_auton_steps[curr_index].startsWith("STARTING_POS(")){
            let pos = get_pos(curr_auton_steps[curr_index]);
            robot.style.left = ((field.offsetLeft + inches_to_pixels(pos.p.x) - 40) / window.innerWidth * 100) + "vw";
            robot.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(pos.p.y) - 20) / window.innerHeight * 100) + "vh";
        }
    }
});

const refresh_point_data = (i, x, y) => {
    elem.style.left = ((field.offsetLeft + inches_to_pixels(curr_auton_steps[curr_index].old_points[i].x) - 5)) + "px";
    elem.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(curr_auton_steps[curr_index].old_points[i].y) - 5)) + "px";
    document.querySelector("#waypointLabel" + i).textContent = `Point ${i+1} (${pixels_to_inches(x)}, ${pixels_to_inches(y)})` 
    x_input.value = pixels_to_inches(x);
    y_input.value = pixels_to_inches(y);
    curr_auton_steps[curr_index].old_points[i].x = pixels_to_inches(x);
    curr_auton_steps[curr_index].old_points[i].y = pixels_to_inches(y);
    refresh_steps();
}

const get_mouse_pos = e => {
    x_pos = e.offsetX;
    y_pos = field.height - e.offsetY;
}

const set_new_pos = i => {
    refresh_point_data(i, x_pos, y_pos);
    refresh_path();
    field.onclick = () => {}
}

const update_x = i => {
    let x = parseFloat(x_input.value);
    if(!isNaN(x)){
        if(x < 0)
            x_input.value = 0;
        else if(x > 144) 
            x_input.value = 144;
        refresh_point_data(i, inches_to_pixels(parseFloat(x_input.value)), inches_to_pixels(curr_auton_steps[curr_index].old_points[i].y));
        refresh_path();
    }
}

const update_y = i => {
    let y = parseFloat(y_input.value);
    if(!isNaN(y)){
        if(y < 0)
            y_input.value = 0;
        else if(y > 144) 
            y_input.value = 144;
        refresh_point_data(i, inches_to_pixels(curr_auton_steps[curr_index].old_points[i].x), inches_to_pixels(parseFloat(y_input.value)));
        refresh_path();
    }
}

const select_waypoint = i => {
    for(elem of point_div.children){
        elem.style.backgroundColor = "#dc8605";
        elem.style.position = "absolute";
    }
    if(i != -1){
        selected_waypoint = document.querySelector("#waypoint" + i);
        x_input.value = curr_auton_steps[curr_index].old_points[i].x;
        y_input.value = curr_auton_steps[curr_index].old_points[i].y;
        document.querySelector("#waypointBtn" + i).checked = true;
        selected_waypoint.style.backgroundColor = "#0000FF";
        field.onmousemove = get_mouse_pos;
        field.onclick = () => {
            set_new_pos(i);
        }
        x_input.onchange = () => {
            update_x(i);
        }
        y_input.onchange = () => {
            update_y(i);
        }
    }
    else{
        field.onclick = () => {}
        x_input.onchange = () => {}
        y_input.onchange = () => {}
    }
}

const show_waypoint_stats = i => {
    for(elem of point_div.children){
        elem.style.backgroundColor = "#dc8605";
        elem.style.position = "absolute";
    }
    curr_point_index = i;
    selected_waypoint = document.querySelector("#waypoint" + i);
    x_input.value = curr_auton_steps[curr_index].points[i].x;
    y_input.value = curr_auton_steps[curr_index].points[i].y;
    angle_text.value = curr_auton_steps[curr_index].angles[i] * (180 / Math.PI);
    linear_text.value = curr_auton_steps[curr_index].linear_velocities[i];
    angular_text.value = curr_auton_steps[curr_index].angular_velocities[i];
    selected_waypoint.style.backgroundColor = "#0000FF";
}

const draw_path = path => {
    point_div.innerHTML = "";
    ctx.clearRect(0, 0, field.height, field.width);
    ctx.drawImage(field_bg, 0, 0);
    if(!old_path_switch.checked)
        for(let i = 0; i < path.old_points.length; i++){
            point_div.innerHTML += "<span class=\"dot\" id=\"waypoint" + i + "\" class=\"dot\" onClick=\"select_waypoint(" + i + ")\"></span>";
            for(let elem of point_div.children)
                elem.style.position = "absolute";
            let curr_waypoint = document.querySelector("#waypoint" + i);
            curr_waypoint.style.left = ((field.offsetLeft + inches_to_pixels(path.old_points[i].x) - 5)) + "px";
            curr_waypoint.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(path.old_points[i].y) - 5)) + "px";
        }
    else
        for(let i = 0; i < path.points.length; i++){
            point_div.innerHTML += "<span class=\"dot\" id=\"waypoint" + i + "\" class=\"dot\" onClick=\"show_waypoint_stats(" + i + ")\"></span>";
            for(let elem of point_div.children)
                elem.style.position = "absolute";
            let curr_waypoint = document.querySelector("#waypoint" + i);
            curr_waypoint.style.left = ((field.offsetLeft + inches_to_pixels(path.points[i].x) - 5)) + "px";
            curr_waypoint.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(path.points[i].y) - 5)) + "px";
        }
    if(!old_path_switch.checked){
        ctx.beginPath();
        for(let i = 1; i < path.points.length; i++){
            let old_pt = path.points[parseInt(i) - parseInt(1)];
            let pt = path.points[i];
            ctx.moveTo(inches_to_pixels(old_pt.x), field.height - inches_to_pixels(old_pt.y));
            ctx.lineTo(inches_to_pixels(pt.x), field.height - inches_to_pixels(pt.y));
        }
        ctx.stroke();
    }
}

min_lookahead_input.onchange = () => {
    let min_lookahead = parseFloat(min_lookahead_input.value);
    if(!isNaN(min_lookahead)){
        if(min_lookahead > parseFloat(max_lookahead_input.value)){
            min_lookahead_input.value = parseFloat(max_lookahead_input.value);
            curr_auton_steps[curr_index].setMinLookahead(parseFloat(max_lookahead_input.value));
        }
        else if(min_lookahead < 3){
            min_lookahead_input.value = "3";
            curr_auton_steps[curr_index].setMinLookahead(3);
        }
        else if(min_lookahead > 18){
            min_lookahead_input.value = "18";
            curr_auton_steps[curr_index].setMinLookahead(18);
        }
        else
            curr_auton_steps[curr_index].setMinLookahead(min_lookahead);
    }
}

max_lookahead_input.onchange = () => {
    let max_lookahead = parseFloat(max_lookahead_input.value);
    if(!isNaN(max_lookahead)){
        if(max_lookahead < parseFloat(min_lookahead_input.value)){
            max_lookahead_input.value = parseFloat(min_lookahead_input.value);
            curr_auton_steps[curr_index].setMaxLookahead(parseFloat(min_lookahead_input.value));
        }
        else if(max_lookahead < 3){
            max_lookahead_input.value = "3";
            curr_auton_steps[curr_index].setMaxLookahead(3);
        }
        else if(max_lookahead > 18){
            max_lookahead_input.value = "18";
            curr_auton_steps[curr_index].setMaxLookahead(18);
        }
        else
            curr_auton_steps[curr_index].setMaxLookahead(max_lookahead);
    }
}

reversed_input.onclick = () => {
    curr_auton_steps[curr_index].setReversed(reversed_input.checked);
}

const create_new_waypoint = () => {
    let new_index = curr_auton_steps[curr_index].old_points.length;
    waypoint_inputs.innerHTML = `<div class="form-check centered" ></div>
        <input class="form-check-input" type="radio" name="waypoints" id="waypointBtnNone" onclick="select_waypoint(-1)" value="">
        <label class="form-check-label" for="waypointBtnNone">None</label>
    </div>
    <br>`;
    for(let i = 0; i < curr_auton_steps[curr_index].old_points.length; i++){
        waypoint_inputs.innerHTML += `<div class="form-check centered"></div>
            <input class="form-check-input" type="radio" name="waypoints" id="waypointBtn${i}" onClick="select_waypoint(${i})" value="">
            <label class="form-check-label" for="waypointBtn${i}" id="waypointLabel${i}">Point ${i+1} (${curr_auton_steps[curr_index].old_points[i].x}, ${curr_auton_steps[curr_index].old_points[i].y})</label>
        </div>
        <br>`;
    }
    curr_auton_steps[curr_index].push_old(new Point2D(0, 0));
    waypoint_inputs.innerHTML += `<div class="form-check centered"></div>
        <input class="form-check-input" type="radio" name="waypoints" id="waypointBtn${new_index}" onClick="select_waypoint(${new_index})" value="" checked>
        <label class="form-check-label" for="waypointBtn${new_index}" id="waypointLabel${new_index}">Point ${new_index+1} (0, 0)</label>    
    </div>
    <br>
    <button onClick="create_new_waypoint()" id="#new-waypoint" class="btn btn-primary text-center"><i class="fa fa-plus"></i>New Point</button>
    <br>`;

    point_div.innerHTML += "<span class=\"dot\" id=\"waypoint" + new_index + "\" class=\"dot\" onClick=\"select_waypoint(" + new_index + ")\"></span>";
    select_waypoint(curr_auton_steps[curr_index].old_points.length - 1);
}

let visualize_step = step => {
    ctx.clearRect(0, 0, field.height, field.width);
    ctx.drawImage(field_bg, 0, 0);
    for(let elem of sliders)
        elem.hidden = true;
    path_inputs.hidden = true;
    robot_div.hidden = true;
    heading_div.hidden = true;
    point_div.hidden = true;
    lookahead_div.hidden = true;
    reversed_div.hidden = true;
    old_path_switch_div.hidden = true;
    lookahead_div.hidden = true;
    point_div.innerHTML = "";
    waypoint_inputs.innerHTML = "";

    if(step instanceof PurePursuitPath || step instanceof RamsetePath){
        for(let elem of sliders)
            elem.hidden = false;
        point_div.hidden = false;
        path_inputs.hidden = false;
        if(step instanceof PurePursuitPath){
            lookahead_div = false;
            reversed_div.hidden = false;
            old_path_switch.checked = false;
            old_path_switch.onclick = () => {}
            intensity_slider.oninput = () => {}
        }
        else{
            ramsete_inputs.hidden = false;
            old_path_switch_div.hidden = false;
            old_path_switch.onclick = () => {
                draw_path(step);
                x_input.disabled = !x_input.disabled;
                y_input.disabled = !y_input.disabled;
            };
            intensity_slider.oninput = () => {
                step.intensity = intensity_slider.value;
                step.update_velocities();
                show_waypoint_stats(curr_point_index);
                draw_path(step);
            }
        }

        waypoint_inputs.innerHTML = `<div class="form-check centered" ></div>
            <input class="form-check-input" type="radio" name="waypoints" id="waypointBtnNone" onClick="select_waypoint(-1)" value="">
            <label class="form-check-label" for="waypointBtnNone">None</label>
        </div>
        <br>`;
        if(!old_path_switch.checked){
            for(let i = 0; i < step.old_points.length; i++){
                waypoint_inputs.innerHTML += `<div class="form-check centered"></div>
                    <input class="form-check-input" type="radio" name="waypoints" id="waypointBtn${i}" onClick="select_waypoint(${i})" value="">
                    <label class="form-check-label" for="waypointBtn${i}" id="waypointLabel${i}">Point ${i+1} (${step.old_points[i].x}, ${step.old_points[i].y})</label>
                </div>
                <br>`;
            }
        }
        else{
            for(let i = 0; i < step.points.length; i++){
                waypoint_inputs.innerHTML += `<div class="form-check centered"></div>
                    <input class="form-check-input" type="radio" name="waypoints" id="waypointBtn${i}" onClick="select_waypoint(${i})" value="">
                    <label class="form-check-label" for="waypointBtn${i}" id="waypointLabel${i}">Point ${i+1} (${step.points[i].x}, ${step.points[i].y})</label>
                </div>
                <br>`;
            }
        }
        waypoint_inputs.innerHTML += `<button onClick="create_new_waypoint()" id="#new-waypoint" class="btn btn-primary text-center"><i class="fa fa-plus"></i>New Point</button>`;
        draw_path(step);
    }
    else{
        if(step.startsWith("STARTING_POS(")){
            let pos = get_pos(step);
            robot_div.hidden = false;
            heading_div.hidden = false;
            robot_x_input.value = pos.p.x;
            robot_y_input.value = pos.p.y;
            heading_input.value = pos.head * 180 / Math.PI;
            heading_range.value = pos.head;
            robot.src = "static/imgs/robot_head.png"
            robot.style.left = ((field.offsetLeft + inches_to_pixels(pos.p.x) - 40) / window.innerWidth * 100) + "vw";
            robot.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(pos.p.y) - 20) / window.innerHeight * 100) + "vh";
            robot.style.transform = "rotate(-" + pos.head * (180 / Math.PI) + "deg)";
            
            robot_x_input.onchange = () => {
                if(robot_x_input.value > 144)
                    robot_x_input.value = 144;
                else if(robot_x_input.value < 0)
                    robot_x_input.value = 0;
                pos.p.x = robot_x_input.value;
                robot.style.left = ((field.offsetLeft + inches_to_pixels(pos.p.x) - 40) / window.innerWidth * 100) + "vw";
                curr_auton_steps[curr_index] = "STARTING_POS(" + pos.toString() + ")";
                refresh_steps();
            }

            robot_y_input.onchange = () => {
                if(robot_y_input.value > 144)
                    robot_y_input.value = 144;
                else if(robot_y_input.value < 0)
                    robot_y_input.value = 0;
                pos.p.y = robot_y_input.value;
                robot.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(pos.p.y) - 20) / window.innerHeight * 100) + "vh";
                curr_auton_steps[curr_index] = "STARTING_POS(" + pos.toString() + ")";
                refresh_steps();
            }

            heading_range.oninput = () => {
                pos.head = heading_range.value;
                robot.style.transform = "rotate(-" + pos.head * (180 / Math.PI) + "deg)";
                heading_input.value = heading_range.value * 180 / Math.PI;
                curr_auton_steps[curr_index] = "STARTING_POS(" + pos.toString() + ")";
                refresh_steps();
            }

            heading_input.onchange = () => {
                if(heading_input.value > 360)
                    heading_input.value = 360;
                else if(heading_input.value < 0)
                    heading_input.value = 0;
                let head = heading_input.value * Math.PI / 180;
                pos.head = heading_input.value;
                robot.style.transform = "rotate(-" + pos.head * (180 / Math.PI) + "deg)";
                heading_range.value = head;
                curr_auton_steps[curr_index] = "STARTING_POS(" + pos.toString() + ")";
                refresh_steps();
            }

            field.onmousemove = get_mouse_pos;
            field.onclick = () => {
                pos.p.x = pixels_to_inches(x_pos);
                pos.p.y = pixels_to_inches(y_pos);
                robot_x_input.value = pos.p.x;
                robot_y_input.value = pos.p.y;
                robot.style.left = ((field.offsetLeft + x_pos - 40) / window.innerWidth * 100) + "vw";
                robot.style.top = (((field.offsetTop + field.offsetHeight) - y_pos - 20) / window.innerHeight * 100) + "vh";
                curr_auton_steps[curr_index] = "STARTING_POS(" + pos.toString() + ")";
                refresh_steps();
            }
        }
        else if(step.startsWith("DRIVE_TO(") || step.startsWith("DRIVE_TO_ASYNC(") || 
                step.startsWith("TURN_TO(") || step.startsWith("TURN_TO_ASYNC(")){
            point_div.hidden = false;
            if(step.startsWith("DRIVE_TO_ASYNC(" || step.startsWith("TURN_TO_ASYNC(")))
                async_input.checked = true;
            else
                async_input.checked = false;
            let point = get_coords(step);
            point_container.innerHTML = "<span class=\"dot\" id=\"point\"></span>"
            document.querySelector("#point").style.position = "absolute";
            document.querySelector("#point").style.left = ((field.offsetLeft + inches_to_pixels(point.x) - 5)) + "px";
            document.querySelector("#point").style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(point.y) - 5)) + "px";
            point_x_input.value = point.x;
            point_y_input.value = point.y;
            
            point_x_input.onchange = () => {
                if(point_x_input.value > 144)
                    point_x_input.value = 144;
                if(point_x_input.value < 0)
                    point_x_input.value = 0;
                point.x = point_x_input.value;
                document.querySelector("#point").style.left = ((field.offsetLeft + inches_to_pixels(point.x) - 5)) + "px";
                if(step.startsWith("DRIVE_TO("))
                    curr_auton_steps[curr_index] = "DRIVE_TO(" + point.toString() + ")";
                if(step.startsWith("DRIVE_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "DRIVE_TO_ASYNC(" + point.toString() + ")";
                if(step.startsWith("TURN_TO("))
                    curr_auton_steps[curr_index] = "TURN_TO(" + point.toString() + ")";
                if(step.startsWith("TURN_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "TURN_TO_ASYNC(" + point.toString() + ")";
                refresh_steps();
            }
            
            point_y_input.onchange = () => {
                if(point_y_input.value > 144)
                    point_y_input.value = 144;
                if(point_y_input.value < 0)
                    point_y_input.value = 0;
                point.y = point_y_input.value;
                document.querySelector("#point").style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(point.y) - 5)) + "px";
                if(curr_auton_steps[curr_index].startsWith("DRIVE_TO("))
                    curr_auton_steps[curr_index] = "DRIVE_TO(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("DRIVE_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "DRIVE_TO_ASYNC(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("TURN_TO("))
                    curr_auton_steps[curr_index] = "TURN_TO(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("TURN_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "TURN_TO_ASYNC(" + point.toString() + ")";
                refresh_steps();
            }

            async_input.onclick = () => {
                if(curr_auton_steps[curr_index].startsWith("DRIVE_TO("))
                    curr_auton_steps[curr_index] = "DRIVE_TO_ASYNC(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("DRIVE_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "DRIVE_TO(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("TURN_TO("))
                    curr_auton_steps[curr_index] = "TURN_TO_ASYNC(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("TURN_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "TURN_TO(" + point.toString() + ")";
                refresh_steps();
            }

            field.onmousemove = get_mouse_pos;
            field.onclick = () => {
                point.x = pixels_to_inches(x_pos);
                point.y = pixels_to_inches(y_pos);
                point_x_input.value = point.x;
                point_y_input.value = point.y;
                document.querySelector("#point").style.left = ((field.offsetLeft + inches_to_pixels(point.x) - 5)) + "px";
                document.querySelector("#point").style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(point.y) - 5)) + "px";
                if(curr_auton_steps[curr_index].startsWith("DRIVE_TO("))
                    curr_auton_steps[curr_index] = "DRIVE_TO(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("DRIVE_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "DRIVE_TO_ASYNC(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("TURN_TO("))
                    curr_auton_steps[curr_index] = "TURN_TO(" + point.toString() + ")";
                else if(curr_auton_steps[curr_index].startsWith("TURN_TO_ASYNC("))
                    curr_auton_steps[curr_index] = "TURN_TO_ASYNC(" + point.toString() + ")";
                refresh_steps();
            }
        }
    }
}

let step_callback = i => {
    curr_index = i;
    visualize_step(curr_auton_steps[i]);
}

let request_auton_file = path => {
    auton_steps.innerHTML = "";
    curr_index = 0
    socket.emit("request-auton-file", path);
}

let parse_step = step => {
    if(step instanceof PurePursuitPath)
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Follow Path From (" + step.old_points[0].toString() + ") to (" + step.old_points.slice(-1).toString() + ") (Pure Pursuit)</a>";
    else if(step instanceof RamsetePath)
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Follow Path From (" + step.old_points[0].toString() + ") to (" + step.old_points.slice(-1).toString() + ") (RAMSETE)</a>";
    else if(step.startsWith("STARTING_POS("))
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Start At (" + get_pos(step).toString() + ")</a>";
    else if(step.startsWith("TURN_TO("))
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Turn To (" + get_coords(step).toString() + ")</a>";
    else if(step.startsWith("TURN_TO_ASYNC("))
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Turn To (" + get_coords(step).toString() + ") (Async)</a>";
    else if(step.startsWith("DRIVE_TO("))
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Drive To (" + get_coords(step).toString() + ")</a>";
    else if(step.startsWith("DRIVE_TO_ASYNC("))
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Drive To (" + get_coords(step).toString() + ") (Async)</a>";
    else if(step == "CHASSIS_WAIT()")
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Wait For Chassis</a>";
    else if(step == "PP_WAIT()")
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Wait For Pure Pursuit</a>";
    else if(step.startsWith("TIME_WAIT("))
        auton_steps.innerHTML += "<a id=\"" + curr_index + "\" class=\"dropdown-item\" href=\"#\" onClick=\"step_callback(parseInt(this.id))\">" + (++curr_index) + ". Wait For " + get_delay_time(step) + " ms</a>";
}

const refresh_steps = () => {
    let prev_index = curr_index;
    curr_index = 0;
    auton_steps.innerHTML = "";
    for(let step of curr_auton_steps)
        parse_step(step);
    curr_index = prev_index;
}

socket.on("receive-auton-path", msg => {  
    if(msg == "END"){
        load_button.disabled = false;
        auton_list.innerHTML += "<a class=\"dropdown-item\" href=\"#\"><i class=\"fa fa-plus\"></i>New Auton</a>"
    }
    else{
        let slash_indices = [];
        let dot_indices = [];
        let filename = "";
        for(let i = 0; i < msg.length; i++){
            if(msg[i] == '/')
                slash_indices.push(i);
            else if(msg[i] == '.')
                dot_indices.push(i);
        }
        filename = msg.substring(parseInt(slash_indices.slice(-1)) + parseInt(1), dot_indices.slice(-1));
        auton_list.innerHTML += "<a class=\"dropdown-item\" href=\"#\" id=\"" + filename + "\" onClick=\"request_auton_file(auton_paths.get(this.id))\">" + filename + "</a>";
        auton_paths.set(filename, msg);
    }
});

const parse_line = msg => {
    receiving_auton = true;
    if(msg == "PATH_BEGIN")
        in_path = true;
    else if(msg == "PATH_END"){
        in_path = false;
        curr_path += msg;
        curr_auton_steps.push(strToPurePursuitPath(curr_path));
        curr_path = "";
    }
    if(msg == "RAMSETE_BEGIN")
        in_path = true;
    else if(msg == "RAMSETE_END"){
        in_path = false;
        curr_path += msg;
        curr_auton_steps.push(strToRamsetePath(curr_path));
        curr_path = "";
    }
    if(in_path)
        curr_path += msg + '\n';
    else if(msg != "END" && msg != "PATH_END" && msg != "RAMSETE_END")
        curr_auton_steps.push(msg);
    else if(msg == "END"){
        auton_steps_button.hidden = false;
        // socket.emit("request-motors", "");
    }
}

socket.on("receive-auton-file", msg => { parse_line(msg); });

socket.on("receive-motor", msg => {
    if(msg != "END")
        motors.push(msg.split(": ")[0]);
    else{
        save_file_button.disabled = false;
        socket.emit("finished-receiving", "");
    }
});

socket.on("begin-auton-editing", msg => {
    for(let step of curr_auton_steps)
        parse_step(step);
});

let refresh_path = () => {
    curr_auton_steps[curr_index].injectPoints(spacing_slider.value);
    curr_auton_steps[curr_index].smoothPath(smoothing_slider.value);
    spacing_label.textContent = spacing_slider.value + "\"";
    smoothing_label.textContent = smoothing_slider.value;
    draw_path(curr_auton_steps[curr_index]);
}

spacing_slider.oninput = refresh_path;
smoothing_slider.oninput = refresh_path;

file_upload.addEventListener('change', (event) => {
    const fileList = event.target.files;
    const file = fileList[0];
    if(file){
        let reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = evt => {
            let contents = evt.target.result;
            let split_contents = contents.split('\n');
            if(split_contents.length > 1 && split_contents[0] == "STARTAUTON"){
                curr_auton_steps = [];
                curr_index = 0;
                auton_steps.innerHTML = "";
                for(let i = 1; i < split_contents.length; i++)
                    parse_line(split_contents[i]);
                for(let step of curr_auton_steps)
                    parse_step(step);
                auton_steps_button.hidden = false;
                save_file_button.disabled = false;
            }
        }
    }
})

save_file_button.onclick = () => {
    let contents = "STARTAUTON\n";
    let last_path_index = -1;
    for(let step of curr_auton_steps)
        contents += step + "\n";
    contents += "END";
    const link = document.createElement("a");
    const file = new Blob([contents], {type: 'text/plain'});
    link.href = URL.createObjectURL(file);
    link.download = "auton.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}