const socket = io();


let playing = false;
let live = false;
let cleared = false;

let fileHandle;

const TIME_INDEX = 0;
const X_INDEX = 1;
const Y_INDEX = 2;
const HEAD_INDEX = 3;
const PATH_INDEX = 4;
const LOOKAHEAD_INDEX = 5;
const GOAL_X_INDEX = 6;
const GOAL_Y_INDEX = 7;

let steps = [];
let paths = [];
let curr_path_index = -1;

let current_timeouts = [];

let timestamp = 0;

let load_button = document.querySelector("#load-auton");
let live_button = document.querySelector("#live-auton");
let load_file_button = document.querySelector('#load-auton-file');
let save_file_button = document.querySelector('#save-auton-file');
let file_upload = document.querySelector("#file-upload")

let play_button = document.querySelector("#play-pause");
let play_bar = document.querySelector("#timestamp");
let diagnostics = document.querySelector("#diagnostics");

play_bar.min = 0;
play_bar.max = steps.length;

robot.style.position = "absolute";

let draw_line = path => {
    ctx.beginPath();
    let pts = path.split("\n");
    for(let i = 1; i < pts.length; i++){
        let old_coords = pts[parseInt(i) - parseInt(1)].split(", ");
        let coords = pts[i].split(", ");
        ctx.moveTo(inches_to_pixels(parseFloat(old_coords[0])), field.height - inches_to_pixels(parseFloat(old_coords[1])));
        ctx.lineTo(inches_to_pixels(parseFloat(coords[0])), field.height - inches_to_pixels(parseFloat(coords[1])));
    }
    ctx.stroke();
}

load_button.onclick = () => {
    steps = [];
    socket.emit("request-auton", "");
    load_button.disabled = true;
    play_bar.disabled = true;
}

live_button.onclick = () => {
    live = !live;
    if(live){
        steps = [];
        socket.emit("live-auton", "");
        live_button.classList.remove("btn-primary");
        live_button.classList.add("btn-danger");
        live_button.textContent = "Stop Live View";
        load_button.disabled = true;
        play_bar.disabled = true;
    }
    else{
        live_button.classList.remove("btn-danger");
        live_button.classList.add("btn-primary");
        live_button.textContent = "Live Auton View";
        load_button.disabled = false;
        socket.emit("stop-live-auton", "");
    }
}

const parse_step = step => {
    if(step.split("\n").length > 1){
        let contents = step.split("\n");
        let new_path = "";
        for(s of contents.slice(1, -1))
            new_path += s + "\n";
        paths.push(new_path);
    }
    else {
        let vals = step.split(", ");
        vals[TIME_INDEX] = parseInt(vals[TIME_INDEX]);
        vals[X_INDEX] = parseFloat(vals[X_INDEX]);
        vals[Y_INDEX] = parseFloat(vals[Y_INDEX]);
        vals[HEAD_INDEX] = parseFloat(vals[HEAD_INDEX]);
        vals[PATH_INDEX] = parseInt(vals[PATH_INDEX]);
        vals[LOOKAHEAD_INDEX] = parseFloat(vals[LOOKAHEAD_INDEX]);
        vals[GOAL_X_INDEX] = parseFloat(vals[GOAL_X_INDEX]);
        vals[GOAL_Y_INDEX] = parseFloat(vals[GOAL_Y_INDEX]);
        steps.push(vals);
    }
}

socket.on("receive-auton", msg => {
    if(msg == "END"){
        play_bar.min = 0;
        play_bar.max = steps.length - 1;
        play_bar.value = 0;
        load_button.disabled = false;
        play_bar.disabled = false;
        save_file_button.disabled = false;
    }
    else
        parse_step(msg);
});

socket.on("receive-live-auton", msg => {
    if(msg != "END"){
        parse_step(msg);
        if(msg.split(", ").length > 2)
            refresh_robot_str(msg);
    }
    else{
        live_button.classList.remove("btn-danger");
        live_button.classList.add("btn-primary");
        live_button.textContent = "Live Auton View";
        play_bar.min = 0;
        play_bar.max = steps.length - 1;
        play_bar.value = 0;
        load_button.disabled = false;
        save_file_button.disabled = false;
        play_bar.disabled = false;
    }
});

let draw_lookahead = (lookahead, x, y, goalX, goalY, curr_angle) => {
    let angle = Math.atan2(goalY - y, goalX - x) - curr_angle;
    robot_ctx.strokeStyle = "#0000ff";
    robot_ctx.beginPath();
    robot_ctx.arc(robot.width / 2, robot.height / 2, inches_to_pixels(lookahead), 0, Math.PI * 2);
    robot_ctx.stroke();
    if(goalX != -999){
        robot_ctx.beginPath();
        robot_ctx.strokeStyle = "#00ff00";
        robot_ctx.moveTo(45, 45);
        robot_ctx.lineTo(inches_to_pixels(lookahead) * Math.cos(angle) + 45, inches_to_pixels(lookahead) * Math.sin(angle + Math.PI) + 45);
        robot_ctx.stroke();
    }
}

window.addEventListener('resize', () =>{
    robot.style.left = ((field.offsetLeft + inches_to_pixels(steps[timestamp][X_INDEX]) - 45) / window.innerWidth * 100) + "vw";
    robot.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(steps[timestamp][Y_INDEX]) - 45) / window.innerHeight * 100) + "vh";
});

let refresh_robot = function(timestamp, x, y, head, path_index, lookahead, goalX, goalY){
    let text = 
    `<p>Timestamp: ${timestamp}</p>
    <p>X: ${x}</p>
    <p>Y: ${y}</p>
    <p>Heading (Rad): ${head}</p>
    <p>Heading (Deg): ${head * 180 / Math.PI}</p>`;
    robot_ctx.clearRect(0, 0, robot.width, robot.height);
    robot_ctx.drawImage(robot_bg, 5, 25);
    robot.style.left = ((field.offsetLeft + inches_to_pixels(x) - 45) / window.innerWidth * 100) + "vw";
    robot.style.top = (((field.offsetTop + field.offsetHeight) - inches_to_pixels(y) - 45) / window.innerHeight * 100) + "vh";
    let angle = head * (180 / Math.PI);
    robot.style.transform = "rotate(-" + angle + "deg)";
    if(path_index == -1 || path_index != curr_path_index)
        if(!cleared){
            ctx.clearRect(0, 0, field.width, field.height);
            robot_ctx.clearRect(0, 0, robot.width, robot.height);
            cleared = true;
            ctx.drawImage(field_bg, 0, 0);
            robot_ctx.drawImage(robot_bg, 5, 25);
    }
    if(path_index != -1){
        draw_line(paths[path_index]);
        if(lookahead != -1){
            draw_lookahead(lookahead, x, y, goalX, goalY, head);
            text += 
            `<p>Lookahead: ${lookahead}</p>
            <p>Goal: ${goalX}, ${goalY}</p>`;
        }
        curr_path_index = path_index;
        cleared = false;
    }
    diagnostics.innerHTML = text;
}

const refresh_robot_str = step => {
    let vals = step.split(", ");
    vals[TIME_INDEX] = parseInt(vals[TIME_INDEX]);
    vals[X_INDEX] = parseFloat(vals[X_INDEX]);
    vals[Y_INDEX] = parseFloat(vals[Y_INDEX]);
    vals[HEAD_INDEX] = parseFloat(vals[HEAD_INDEX]);
    vals[PATH_INDEX] = parseInt(vals[PATH_INDEX]);
    vals[LOOKAHEAD_INDEX] = parseFloat(vals[LOOKAHEAD_INDEX]);
    vals[GOAL_X_INDEX] = parseFloat(vals[GOAL_X_INDEX]);
    vals[GOAL_Y_INDEX] = parseFloat(vals[GOAL_Y_INDEX]);
    refresh_robot(vals[TIME_INDEX], vals[X_INDEX], vals[Y_INDEX], vals[HEAD_INDEX], 
                  vals[PATH_INDEX], vals[LOOKAHEAD_INDEX], vals[GOAL_X_INDEX], 
                  vals[GOAL_Y_INDEX]);
}

play_bar.oninput = () => {
    for(id of current_timeouts)
        clearTimeout(id);
    play_button.src = "static/imgs/play.png";
    playing = false;
    timestamp = play_bar.value;
    refresh_robot(steps[timestamp][TIME_INDEX], steps[timestamp][X_INDEX], steps[timestamp][Y_INDEX], 
                  steps[timestamp][HEAD_INDEX], steps[timestamp][PATH_INDEX], steps[timestamp][LOOKAHEAD_INDEX], 
                  steps[timestamp][GOAL_X_INDEX], steps[timestamp][GOAL_Y_INDEX]);
}

play_button.onclick = () => {
    playing = !playing;
    if(playing){
        let total_time = 0;
        play_button.src = "static/imgs/pause.png";
        current_timeouts = [];
        for(let i = ((timestamp >= play_bar.max - 1) ? 0 : timestamp); i < steps.length - 1; i++){
            if(!playing){
                for(id of current_timeouts)
                    cancelTimeout(id);
                break;
            }
            current_timeouts.push(setTimeout(() => {
                timestamp = i;
                play_bar.value = i;
                    refresh_robot(steps[i][TIME_INDEX], steps[i][X_INDEX], steps[i][Y_INDEX], steps[i][HEAD_INDEX], 
                                  steps[i][PATH_INDEX], steps[i][LOOKAHEAD_INDEX], steps[i][GOAL_X_INDEX], steps[i][GOAL_Y_INDEX]);
            }, total_time));
            total_time += (steps[parseInt(i) + parseInt(1)][TIME_INDEX] - steps[i][TIME_INDEX]);  //First array access does string concatenation, for some reason.
        }
        current_timeouts.push(setTimeout(() => {
            play_button.src = "static/imgs/play.png";
            playing = false;
        }, total_time));
    }
    else{
        for(id of current_timeouts)
            clearTimeout(id);
        play_button.src = "static/imgs/play.png";
    }
}

file_upload.addEventListener('change', (event) => {
    const fileList = event.target.files;
    const file = fileList[0];
    if(file){
        let reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = evt => {
            let contents = evt.target.result;
            let step = ""
            let path = ""
            if(contents.split('\n').length > 1 && contents.split('\n')[0] == "STARTAUTON"){
                steps = [];
                let split_contents = contents.split('\n');
                for(let i = 1; i < split_contents.length; i++){
                    if(split_contents[i] == "PATH_BEGIN"){
                        while(step != "PATH_END"){
                            step = split_contents[i++];
                            path += step + "\n";
                        }
                        step = path;
                    }
                    else
                        step = split_contents[i];
                    if(step.length != 0)
                        parse_step(step);
                }
            }
            play_bar.min = 0;
            play_bar.max = steps.length - 1;
            play_bar.value = 0;
            save_file_button.disabled = false;
            play_bar.disabled = false;
            playing = false;
        }
    }
})

save_file_button.onclick = () => {
    let contents = "STARTAUTON\n";
    let last_path_index = -1;
    for(s of steps){
        if(s[4] != -1 && s[4] != last_path_index){
            contents += paths[s[4]] + "\n";
            last_path_index = s[4];
        }
        for(let i = 0; i < s.length - 1; i++)
            contents += s[i] + ", ";
        contents += s.slice(-1) + "\n";
    }
    const link = document.createElement("a");
    const file = new Blob([contents], {type: 'text/plain'});
    link.href = URL.createObjectURL(file);
    link.download = "auton.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}