class Point2D {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    toString() {
        return this.x + ", " + this.y;
    }
}

class Pos {
    constructor(p, head) {
        this.p = p;
        this.head = head;
    }

    toString() {
        return this.p.toString() + ", " + this.head;
    }
}

const ptToPtDistance = (p1, p2) => {
    return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
}
    
const strToPoint = str => {
    let coords = str.split(', ');
    return new Point2D(parseFloat(coords[0]), parseFloat(coords[1]));
}

class Circle {
    #center;
    #radius;

    constructor(p1, p2, p3) {
        if(p3 === undefined) {
            this.#center = p1;
            this.#radius = p2;
        }
        else{
            let x12 = p1.x - p2.x;
            let x13 = p1.x - p3.x;
        
            let y12 = p1.y - p2.y;
            let y13 = p1.y - p3.y;
        
            let y31 = p3.y - p1.y;
            let y21 = p2.y - p1.y;
            
            let x31 = p3.x - p1.x;
            let x21 = p2.x - p1.x;
        
            let sx13 = p1.x * p1.x - p3.x * p3.x;
            let sy13 = p1.y * p1.y - p3.y * p3.y;
            let sx21 = p2.x * p2.x - p1.x * p1.x;
            let sy21 = p2.y * p2.y - p1.y * p1.y;
        
            let h = -(((sx13) * (y12)
                    + (sy13) * (y12)
                    + (sx21) * (y13)
                    + (sy21) * (y13))
                    / (2 * ((x31) * (y12) - (x21) * (y13))));
        
            let k = -(((sx13) * (x12)
                    + (sy13) * (x12)
                    + (sx21) * (x13)
                    + (sy21) * (x13))
                    / (2 * ((y31) * (x12) - (y21) * (x13))));
        
            let c = -(p1.x * p1.x) - p1.y * p1.y - 2 * -h * p1.x - 2 * -k * p1.y;
        
            this.#center = new Point2D(h, k);
            this.#radius = Math.sqrt(h * h + k * k - c);
        }
    }

    getIntersection(c) {
        let dist = ptToPtDistance(this.#center, c.getCenter());
        if(dist > this.#radius + c.getRadius())
            return [new Point2D(-999, -999), new Point2D(-999, -999)];
        if(dist < Math.abs(this.#radius - c.getRadius()))
            return [new Point2D(-999, -999), new Point2D(-999, -999)];
        if(dist == 0 && this.#radius == c.getRadius())
            return [new Point2D(-999, -999), new Point2D(-999, -999)];
        let a = (radius * radius - c.radius * c.radius + dist * dist) / (2 * dist);
        let h = Math.sqrt(radius * radius - a * a);
        let x2 = this.#center.x + a * (c.getCenter().x - this.#center.x) / dist;   
        let y2 = this.#center.y + a * (c.getCenter().y - this.#center.y) / dist;   
        let x3 = x2 + h * (c.getCenter().y - this.#center.y) / dist;
        let y3 = y2 - h * (c.getCenter().x - this.#center.x) / dist;
        let x4 = x2 - h * (c.getCenter().y - this.#center.y) / dist;
        let y4 = y2 + h * (c.getCenter().x - this.#center.x) / dist;
        return [new Point2D(x3, y3), new Point2D(x4, y4)];
    }

    getPoint(angle) { 
        return new Point2D(this.#center.x + this.#radius * Math.cos(angle), this.#center.y + this.#radius * Math.sin(angle)); 
    }

    getRadians(p) { 
        return boundRad(Math.atan2(center.y - p.y, center.x - p.x)); 
    }

    getDegrees(p) {
        getRadians(p) * 180 / Math.PI;
    }

    inCircle(p) {
        return ptToPtDistance(p, this.#center) < this.#radius;
    }

    getCenter() { return this.#center; }
    getRadius() { return this.#radius; }

    setCenter(c) { this.#center = c; }
    setRadius(r) { this.#radius = r; }
}


class Line2D {
    constructor(p1, p2){
        this.p1 = p1;
        this.p2 = p2;
    }

    getPoint(i) {
        const slope = (this.p2.y - this.p1.y) / (this.p2.x - this.p1.x);
        const intercept = this.p1.y - slope * this.p1.x;

        return slope * i + intercept;
    }

    inBounds(p) {
        let min_x = (this.p1.x < this.p2.x) ? this.p1.x : this.p2.x;
        let max_x = (this.p1.x > this.p2.x) ? this.p1.x : this.p2.x;
        let min_y = (this.p1.y < this.p2.y) ? this.p1.y : this.p2.y;
        let max_y = (this.p1.y > this.p2.y) ? this.p1.y : this.p2.y;
        return p.x >= min_x && p.x <= max_x && p.y >= min_y && p.y <= max_y;
    }

    toVector() {
        return new Vector2D(p1, p2);
    }
}

class Vector2D {
    constructor(p1, p2){
        if(p1 instanceof Point2D){
            this.x = p2.x - p1.x;
            this.y = p2.y - p1.y;
        }
        else{
            this.x = p1;
            this.y = p2;
        }
    }

    getAngle() {
        return Math.atan2(this.y, this.x);
    }

    magnitude() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    normalize() {
        return divideVector(this, this.magnitude());
    }
}

const addVector = (v1, v2) => { return new Vector2D(v1.x + v2.x, v1.y + v2.y); }
const subtractVector = (v1, v2) => { return new Vector2D(v1.x - v2.x, v1.y - v2.y); }
const multiplyVector = (v1, rhs) => { if(rhs instanceof Vector2D) return v1.x * rhs.x + v1.y * rhs.y; else return new Vector2D(v1.x * rhs, v1.y * rhs); }
const divideVector = (v1, rhs) => { return new Vector2D(v1.x / rhs, v1.y / rhs); }

class Matrix {
    constructor(elems){
        if(Array.isArray(elems))
            this.elems = elems;
    }
}

const multiplyMatrix = (m1, val) => {
    let m = new Matrix([]);
    if(!val instanceof Matrix){
        m = _.cloneDeep(m1);
        for(let e of m.elems)
            for(let v of e)
                v *= val;
    }
    else{
        if(val.elems.length != m1.elems[0].length){
            console.log("Could not multiply matrices.");
            return m1;
        }
        else{
            let new_elems;
            for(let i = 0; i < m1.elems.length; i++){
                m.elems.push([]);
                for(let j = 0; j < val.elems[0].length; j++){
                    let sum = 0;
                    for(let k = 0; k < val.elems.length; k++){
                        sum += m1.elems[i][k] * val.elems[k][j];
                    }
                    m.elems[i].push(sum);
                }
            }
            return m;
        }
    }
}

class Curve {
    #points = [];
    #old_points = [];
    #spacing;
    #smoothing;

    constructor(points) { 
        if(Array.isArray(points)){
            for(let p of points){
                this.#points.push(p);
                this.#old_points.push(p);
            }
        }
    }


    get points() { return this.#points; }
    get old_points() { return this.#old_points; }
    get spacing() { return this.#spacing; }
    get smoothing() { return this.#smoothing; }

    set spacing(s) { this.#spacing = s; }
    set smoothing(s) { this.#smoothing = s; }

    push(point) { this.#points.push(point); }
    push_old(point) { this.#old_points.push(point); }

    injectPoints(ispacing = 6.0) {
        if(ispacing == 0){
            this.#points = _.cloneDeep(this.#old_points);
            return;
        }
        this.#spacing = ispacing;
        this.#points = [];
        this.#points.push(this.#old_points[0]);
        for(let i = 0; i < this.#old_points.length - 1; i++){
            let start = this.#old_points[i];
            let vec = new Vector2D(start, this.#old_points[i+1]);
            let numPoints = Math.ceil(vec.magnitude() / ispacing);
            let vecNorm = multiplyVector(vec.normalize(), ispacing);
            for(let j = 1; j < numPoints; j++){
                this.#points.push(new Point2D(start.x + vecNorm.x * j, start.y + vecNorm.y * j));
            }
            this.#points.push(this.#old_points[i+1]);
        }
    }

    smoothPath(weight_smooth = 0.78, tolerance = 0.001){
    
        this.#smoothing = weight_smooth;
    
        let newPath = _.cloneDeep(this.#points);
    
        let change = tolerance;
    
        while(change >= tolerance){
            change = 0.0;
            for(let i = 1; i < newPath.length - 1; i++){
                for(let j = 0; j < 2; j++){
                    if(j == 0){
                        let aux = newPath[i].x;
                        newPath[i].x += ((1 - weight_smooth) * (this.#points[i].x - newPath[i].x) + weight_smooth * (newPath[i-1].x + newPath[i+1].x - (2.0 * newPath[i].x)));
                        change += Math.abs(aux - newPath[i].x)
                    }
                    if(j == 1){
                        let aux = newPath[i].y;
                        newPath[i].y += ((1 - weight_smooth) * (this.#points[i].y - newPath[i].y) + weight_smooth * (newPath[i-1].y + newPath[i+1].y - (2.0 * newPath[i].y)));
                        change += Math.abs(aux - newPath[i].y);
                    }
                }
            }
        }
        this.#points = _.cloneDeep(newPath);
    }

    toString() {
        let ret = ""; 
        ret += "CURVE_BEGIN\n" + this.#spacing + "\n" + this.#smoothing + "\n" + "OLD_CURVE_BEGIN\n"; 
        for(let p of this.#old_points) 
            ret += p.toString() + "\n";
        ret += "OLD_CURVE_END\n";
        for(let p of this.#points)
            ret += p.toString() + "\n";
        ret += "CURVE_END"; 
        return ret;
    }
}


class PurePursuitPath extends Curve {
    #reversed;
    #reroute_distance;
    #reroute_bounds
    #min_lookahead;
    #max_lookahead;
    
    constructor(points){
        super(points);
        this.#reversed = false;
        this.#reroute_distance = 0;
        this.#reroute_bounds = [0, 0, 0, 0];
        this.#min_lookahead = 3;
        this.#max_lookahead = 11;
    }

    get reversed() { return this.#reversed; }
    get reroute() { return this.#reroute_distance; }
    get bounds() { return this.#reroute_bounds; }
    get min_lookahead() { return this.#min_lookahead; }
    get max_lookahead() { return this.#max_lookahead; }

    set reversed(r) { this.#reversed = r; }
    set reroute(r) { this.#reroute_distance = r; }
    set bounds(b) { this.#reroute_bounds = b; }
    set min_lookahead(l) { this.#min_lookahead = l; }
    set max_lookahead(l) { this.#max_lookahead = l; }

    toString() {
        let res = "PATH_BEGIN\n" + this.spacing + '\n' + this.smoothing + "\nOLD_PATH_BEGIN\n";
        for(let p of this.old_points)
            res += p.toString() + "\n";
        res += "OLD_PATH_END\n" + this.#min_lookahead + '\n' + this.#max_lookahead + '\n' +
                this.#reversed + '\n' + this.#reroute_distance + '\n' + 
                this.#reroute_bounds[0] + '\n' + this.#reroute_bounds[1] + '\n' + 
                this.#reroute_bounds[2] + '\n' + this.#reroute_bounds[3] + '\n';
        for(let p of this.points)
            res += p.toString() + '\n';
        res += "PATH_END";
        return res;
    }
}

class RamsetePath extends Curve {
    #angles = [];
    #linear_velocities = []; 
    #angular_velocities = [];
    #max_vel;
    #start_angle;
    #end_angle;
    #b;
    #zeta;
    #intensity;

    constructor(points, max_vel, start_angle, end_angle, intensity = 0.1, b = 2.0, zeta = 0.7){
        super(points);
        this.#max_vel = max_vel;
        this.#start_angle = start_angle;
        this.#end_angle = end_angle;
        this.#intensity = intensity;
        this.#b = b;
        this.#zeta = zeta;
    }

    get angles() { return this.#angles; }
    get linear_velocities() { return this.#linear_velocities; }
    get angular_velocities() { return this.#angular_velocities; }
    get max_vel() { return this.#max_vel; }
    get b() { return this.#b; }
    get zeta() { return this.#zeta; }
    get intensity() { return this.#intensity; }
    get start_angle() { return this.#start_angle; }
    get end_angle() { return this.#end_angle; }

    set max_vel(m) { this.#max_vel = m; }
    set b(b) { this.#b = b; }
    set zeta(z) { this.#zeta = z; }
    set intensity(i) { this.#intensity = i; }
    set start_angle(s) { this.#start_angle = s; }
    set end_angle(e) { this.#end_angle = e; }

    update_velocities() {
        this.#angles = [this.#start_angle];
        this.#linear_velocities = [0];
        this.#angular_velocities = [0];
        for(let i = 1; i < this.points.length - 1; i++){
            let c = new Circle(this.points[i-1], this.points[i], this.points[i+1]);
            let v1 = new Vector2D(this.points[i], this.points[i+1]);
            let v2 = new Vector2D(this.points[i-1], this.points[i]);
            this.#angles.push(v1.getAngle());
            let deltaTheta;
            if(i > 1)
                deltaTheta = v1.getAngle() - v2.getAngle();
            else
                deltaTheta = v1.getAngle() - this.#start_angle;
            let lin_vel = this.#intensity / (1. / (c.getRadius() * 0.0254));
            if(lin_vel < -this.#max_vel)
                lin_vel = -this.#max_vel;
            else if(lin_vel > this.#max_vel)
                lin_vel = this.#max_vel;
            else if(Number.isNaN(lin_vel))
                lin_vel = this.#max_vel;
            let deltaT = ((c.getRadius() * 0.0254) * deltaTheta) / lin_vel;
            if(Number.isNaN(deltaT))
                deltaT = 0;
            this.#linear_velocities.push(lin_vel);
            this.#angular_velocities.push(deltaTheta * deltaT);
        }
        this.#angles.push(this.#end_angle);
        this.#linear_velocities.push(0);
        this.#angular_velocities.push(0);
    }

    injectPoints(spacing = 6.0){
        super.injectPoints(spacing);
        this.update_velocities();
    }

    smoothPath(weight_smooth = 0.78, tolerance = 0.001){
        super.smoothPath(weight_smooth, tolerance);
        this.update_velocities();
    }

    toString() {
        let ret = "RAMSETE_BEGIN\n";
        ret += this.spacing + "\n" + this.smoothing + "\n" + this.#max_vel + "\n" + this.#b + "\n" + this.#zeta + "\n" + this.#intensity + "\n" + "OLD_RAMSETE_BEGIN\n"; 
        for(let p of this.old_points) 
            ret += p.toString() + "\n";
        ret += "OLD_RAMSETE_END\n";
        for(let p of this.points) 
            ret += p.toString() + "\n";
        ret += "RAMSETE_POINTS_END\n";
        ret += boundRad(this.#start_angle) + ", " + 0 + ", " + 0 + "\n";
        for(let i = 1; i < this.#angles.length - 1; i++)
            ret += boundRad(this.#angles[i]) + ", " + this.#linear_velocities[i] + ", " + this.#angular_velocities[i] + "\n";
        ret += boundRad(this.#end_angle) + ", " + 0 + ", " + 0 + "\nRAMSETE_END";
        return ret;
    }
}

const strToPurePursuitPath = str => {
    let lines = str.split('\n');
    let path = new PurePursuitPath([]);
    let bounds = [];
    if(lines[0] != "PATH_BEGIN")
        return path;
    let i = 1;
    path.spacing = parseFloat(lines[i++]);
    path.smoothing = parseFloat(lines[i++]);
    i++;
    while(lines[i] != "OLD_PATH_END"){
        path.push_old(strToPoint(lines[i]));
        i++;
    }
    path.min_lookahead = parseFloat(lines[++i]);    
    path.max_lookahead = parseFloat(lines[++i]);
    path.reversed = parseInt(lines[++i]);
    path.reroute = parseFloat(lines[++i]);
    bounds.push(parseFloat(lines[++i]));
    bounds.push(parseFloat(lines[++i]));
    bounds.push(parseFloat(lines[++i]));
    bounds.push(parseFloat(lines[++i]));
    path.bounds = bounds;
    i++;
    while(lines[i] != "PATH_END"){
        path.push(strToPoint(lines[i]));
        i++;
    }
    return path;
}

const strToRamsetePath = str => {
    let lines = str.split('\n');
    let path = new RamsetePath([]);
    if(lines[0] != "RAMSETE_BEGIN")
        return path;
    let i = 1;
    path.spacing = parseFloat(lines[i++]);
    path.smoothing = parseFloat(lines[i++]);
    path.max_vel = parseFloat(lines[i++]);
    path.b = parseFloat(lines[i++]);
    path.zeta = parseFloat(lines[i++]);
    path.intensity = parseFloat(lines[i++]);
    i++
    while(lines[i] != "OLD_RAMSETE_END"){
        path.push_old(strToPoint(lines[i]));
        i++;
    }
    i++;
    while(lines[i] != "RAMSETE_POINTS_END"){
        path.push(strToPoint(lines[i]));
        i++;
    }
    i++;
    while(lines[i] != "RAMSETE_END"){
        let vals = lines[i].split(", ");
        path.angles.push(parseFloat(vals[0]));
        path.linear_velocities.push(parseFloat(vals[1]));
        path.angular_velocities.push(parseFloat(vals[2]));
        i++
    }
    path.start_angle = path.angles[0];
    path.end_angle = path.angles.slice(-1)[0];
    return path;
}

const weighted_avg = (first, second, pct) => {
    return (first * (1. - pct)) + (second * pct);
}

const pixels_to_inches = px =>{
    return px * (144. / 480.);
} 

const inches_to_pixels = coord => {
    return coord * (480. / 144.);
}

const get_pos = str => {
    let vals = str.substring(parseInt(str.indexOf('(')) + parseInt(1), str.lastIndexOf(')')).split(", ");
    return new Pos(new Point2D(vals[0], vals[1]), vals[2] * 180 / Math.PI);
}

const get_coords = str => {
    let vals = str.substring(parseInt(str.indexOf('(')) + parseInt(1), str.lastIndexOf(')'));
    return strToPoint(vals);
}

const get_delay_time = str => {
    return parseFloat(str.substring(parseInt(str.indexOf('(')) + parseInt(1), str.lastIndexOf(')')));
}

const get_motor_group_position = str => {
    let vals = str.substring(parseInt(str.indexOf('(')) + parseInt(1), str.lastIndexOf(')')).split(", ");
    return [vals[0], parseFloat(vals[1]), parseInt(vals[2])];
}

const get_motor_group_voltage = str => {
    let vals = str.substring(parseInt(str.indexOf('(')) + parseInt(1), str.lastIndexOf(')')).split(", ");
    return [vals[0], parseInt(vals[1])];
}

const boundRad = (val) => {
    val %= (2.0 * Math.PI);
    while(val < 0)
        val += (2.0 * Math.PI);
    return val;
}