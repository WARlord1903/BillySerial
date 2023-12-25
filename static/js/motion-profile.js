let chart = document.querySelector("#chart").getContext("2d");
let graph;

let template_list = document.querySelector("#template-list");

let spacing_slider = document.querySelector("#spacing-range")
let smoothing_slider = document.querySelector("#smoothing-range");

let submit_button = document.querySelector("#submit");

let spacing_div = document.querySelector("#spacing");
let smoothing_div = document.querySelector("#smoothing");
let slope_div = document.querySelector("#slope");
let sustain_div = document.querySelector("#sustain");

let spacing_range = document.querySelector("#spacing-range");
let smoothing_range = document.querySelector("#smoothing-range");;
let slope_input = document.querySelector("#slope");
let sustain_input = document.querySelector("#sustain");
let peak_input = document.querySelector("#peak");
let start_input = document.querySelector("#start");
let end_input = document.querySelector("#end");

spacing_range.value = 0;
smoothing_range.value = 0;
slope_input.value = "";
sustain_input.value = "";
peak_input.value = "";
start_input.value = "";
end_input.value = "";

spacing_slider.min = 0;
spacing_slider.max = 1000;

let triangle = document.querySelector("#triangle");
let trapezoid = document.querySelector("#trapezoid");

let curve = new Curve([]);
curve.spacing = 0;
curve.smoothing = 0;
let curve_type;

let x_values = [];
let y_values = [];

triangle.onclick = () => {
    spacing_div.hidden = false;
    smoothing_div.hidden = false;
    slope_div.hidden = false;
    sustain_div.hidden = true;
    start_input.hidden = false;
    end_input.hidden = false;
    peak_input.hidden = false;

    curve = triangle_curve(slope_input.value, start_input.value, end_input.value, peak_input.value);
    curve_type = "triangle";

    curve.spacing = 0;
    curve.smoothing = 0;

    update_values();
    draw_profile();
}

trapezoid.onclick = () => {
    spacing_div.hidden = false;
    smoothing_div.hidden = false;
    slope_div.hidden = false;
    sustain_div.hidden = false;
    start_input.hidden = false;
    end_input.hidden = false;
    peak_input.hidden = false;

    curve_type = "trapezoid";
    curve = trapezoid_curve(slope_input.value, sustain_input.value, start_input.value, end_input.value, peak_input.value);

    curve.spacing = 0;
    curve.smoothing = 0;

    update_values();
    draw_profile();
}

const draw_profile = () => {
    if(graph instanceof Chart)
        graph.destroy()

    let data = {
        labels: x_values,
        datasets: [{
            data: y_values,
            borderColor: "#FF0000",
        }],
        options: {
            transitions: {
                resize: {
                    duration: 0
                }
            }
        }
    }

    graph = new Chart(chart, {
        type: "line",
        data: data,
    });

}

const update_values = () => {
    x_values = curve.points.map((p) => p.x);
    y_values = curve.points.map((p) => p.y);
    spacing_slider.max = x_values.slice(-1);
}

const triangle_curve = (slope, start, end, peak) => {
    if(slope === "")
        slope = 500;
    if(start === "")
        start = 0;
    if(end === "")
        end = 0;
    if(peak === "")
        peak = 12000;
    return new Curve([
        new Point2D(0, parseInt(start)),
        new Point2D(parseInt(slope), parseInt(peak)),
        new Point2D(parseInt(slope) * 2, parseInt(end))
    ]);
}

const trapezoid_curve = (slope, sustain, start, end, peak) => {
    if(slope === "")
        slope = 500;
    if(sustain === "")
        sustain = 1000;
    if(start === "")
        start = 0;
    if(end === "")
        end = 0;
    if(peak === "")
        peak = 12000;
    return new Curve([
        new Point2D(0, parseInt(start)),
        new Point2D(parseInt(slope), parseInt(peak)),
        new Point2D(parseInt(slope) + parseInt(sustain), parseInt(peak)),
        new Point2D(parseInt(slope) * 2 + parseInt(sustain), parseInt(end))
    ]);
}

const update_curve = () => {
    if(peak_input.value > 12000)
        peak_input.value = 12000;
    else if(peak_input.value < 0)
        peak_input.value = 0;
    if(curve_type == "triangle")
        curve = triangle_curve(slope_input.value, start_input.value, end_input.value, peak_input.value);
    else if(curve_type == "trapezoid")
        curve = trapezoid_curve(slope_input.value, sustain_input.value, start_input.value, end_input.value, peak_input.value);
    curve.injectPoints(spacing_slider.value);
    curve.smoothPath(smoothing_slider.value);
    update_values();
    draw_profile();
}

spacing_slider.oninput = update_curve;
smoothing_slider.oninput = update_curve;
slope_input.onchange = update_curve;
sustain_input.onchange = update_curve;
start_input.onchange = update_curve;
end_input.onchange = update_curve;
peak_input.onchange = update_curve;

const save_profile = () => {
    console.log(curve.spacing);
    return curve.toString();
}

submit_button.onclick = () => {
    const link = document.createElement("a");
    const file = new Blob([save_profile()], {type: 'text/plain'});
    link.href = URL.createObjectURL(file);
    link.download = "profile.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}