;
( function( $) {

    function jqExtendor(name, fn) {
        var ext = {};
        ext[name] = function(pass) {
            return $(this).map(function(){ 
                return fn($(this), pass);
            });
        }
        $.fn.extend(ext);
    };
    
    function jqDefine(name, cstr) {
        jqExtendor(name, function($e,p){return new cstr($e,p)});
    };
    
    function jqBuild(name, fn) {
        jqExtendor(name, fn);
    };
    
    function jqMerge(defs, vals) {
        return $.extend($.extend({}, defs), vals);
    }


    // -------------------------------------------------------------------------
    //
    // common util functions
    //
    // -------------------------------------------------------------------------
    
    
    function toProgressArray(work) {
        if (work.constructor === String) {
            work = work.split("/");   
        } 
        if (work.constructor === Array && work.length == 1) {
            work[1] = work[0];
            work[0] = 0;
        }
	    return work;
    }

    var TIME_RE = /(\d+)\s*([ms]?)/g;
    function toMillis(time) {
        var millis = 0;
        
        var match;
        var pattern = TIME_RE;
        pattern.lastIndex = 0; // just to be sure
        while ((match = pattern.exec(time)) !== null) {
            var mult = 1;
            if (match[2] == "s") {
                mult = 1000;
            } else if (match[2] == "m") {
                mult = 60000;
            }
            millis += mult * match[1];
        }
        return millis;
    }



    // -------------------------------------------------------------------------
    //
    // cockipt-meter
    //
    // -------------------------------------------------------------------------

    
    jqDefine("cockpit", Cockpit);
    
    function Cockpit($elm, config) {
        this.$elm = $elm;
        this.gc = $elm.get(0).getContext('2d');

        this.height = $elm.height();
        this.width  = $elm.width();
        var logo = $("img", $elm).eq(0);
        this.logoUri = (logo) ? logo.attr("src") : "";
        // TODO check trick below: doesn't work on chrome, but does on ffx
        // this.logo = logo.get(0);
        
        this.config = jqMerge(Cockpit.config, config);
        this.init();
    }
    
    Cockpit.config = {
        "font"              : "50px Arial",
        "text-color"        : "rgba(0, 0, 0, 1.0)",
        "logo-size"         :  60,
        "logo-offset"       :  10,
        "inset"             :   5,
        "round"             :   0.25,
        "background-fill"   : "rgba(200,200,100, 0.5)",
        "background-stroke" : "rgba(200,200,100, 0.8)",
        "background-border" :   0,
        "urgency-colors"    : ["rgba(230,0,0,0.7)",  "rgba(0,0,230,0.7)"],
        "percent-color"     : "rgba(255,255,255,0.5)",
        "radius-min"        :   5,
        "volume-max"        :  50
    }
    
    for (var i = 0; i< 23; i++) {
        Cockpit.config["urgency-colors"][i] = 
            "rgba(" + (230 - i*10) + ",0," + i*10 + ",0.7 )";
    }
    
    function demoData(me) {

    	var data ={}
        var rndCaptions = [ "23-03", "24-04", "06-05", "21-07", "25-08", "30-08", "04-09", "17-09", "30-09", "17-10", "28-10", "01-11", "11-11", "15-11", "21-11", "06-12", "12-12", "24-12", "25-12", "28-12", "31-12", "01-01", "06-01"];
        var rndUpx   = Math.random();
        data.slack   = Math.floor( rndUpx * me.config["urgency-colors"].length);
        data.at      = rndCaptions[ Math.floor(rndUpx * rndCaptions.length)];
        var volume  = Math.floor( Math.random() * me.config["volume-max"]);  
        var percent = Math.floor( Math.random() * volume);
        data.work   = percent  + "/" + volume;

        return data;
    }

    Cockpit.prototype.init = function() {

        // check data
        var data = this.$elm.data("meter");
        if (data == "demo") {
            data = demoData(this);
        }
        this.plot(data);

        // check refresh
        var refresh = this.$elm.data("refresh");
        var rate = toMillis(refresh.each);
        var uri = refresh.uri;
    }

    Cockpit.prototype.plot = function(data) {

        this.urgency = data.slack;
        this.caption = data.at;
        var work     = toProgressArray(data.work);
        
        this.volume  = work[1];
        this.percent = work[0];
        this.draw();
    }
    

    Cockpit.prototype.debug = function() {
        this.gc.save();
        try {
            this.gc.font= "20px Optimer";
            this.gc.fillStyle = "rgba(0, 0, 0, 0.5)";
            
            this.gc.fillRect(0,0,10,10);
            this.gc.translate(0,30);
            this.gc.fillText("hello world: " + this.width + "x" + this.height, 0,0);
            this.gc.translate(0,20);
            this.gc.fillText("logo: " + this.logoUri, 0, 0);
            this.gc.translate(0,20);
            this.gc.fillText("text-color: " + this.config["text-color"], 0, 0);
            this.gc.translate(0,20);
            this.gc.fillText("caption: " + this.caption, 0, 0);
            this.gc.translate(0,20);
            this.gc.fillText("volume: " + this.volume, 0, 0);
            this.gc.translate(0,20);
            this.gc.fillText("urgency: " + this.urgency, 0, 0);
            this.gc.translate(0,20);
            this.gc.fillText("percent: " + this.percent, 0, 0);
        } finally {
            this.gc.restore();
        }
    }
  
    Cockpit.prototype.draw = function() {
        this.drawBackground();
        this.drawLogo();
        this.drawCaption();
        this.drawPie();
    }
    
    Cockpit.prototype.drawBackground = function() {
        var round = this.config["round"];
        var inset = this.config["inset"];
        
        this.gc.save();
        try {
            this.gc.fillStyle = this.config["background-fill"];
            this.gc.strokeStyle = this.config["background-stroke"];
            this.gc.lineWidth = this.config["background-border"];
            this.gc.translate(this.width/2, this.height/2); // center
            GCLIB.roundedRect(this.gc, this.width - 2*inset, this.height - 2*inset, round);
            this.gc.stroke();
            this.gc.fill();
        } finally {
            this.gc.restore();
        }
    }
    
    Cockpit.prototype.drawLogo = function() {
        if (this.logo) {
            var size = this.config["logo-size"];
            var offset = this.config["logo-offset"] + this.config["inset"];
            this.gc.save();
                this.gc.translate(offset, offset);
                this.gc.drawImage(this.logo,0,0, size, size);
            this.gc.restore();
            return;
        }
        
        //else no logo available, let's load it
        if (!this.logoUri) 
            return;
        //else load it
        this.logo = null;
        var logo = new Image();
        var me = this;

        logo.onload = function() {
            me.logo = logo;
            me.drawLogo();
        }
        logo.src = this.logoUri;
    }
    
    Cockpit.prototype.drawCaption = function() {
        this.gc.save();
        try {
            this.gc.textAlign = "center";
            this.gc.textBaseline = "bottom";
            var x = this.width /2;
            var y = this.config["inset"] + this.config["logo-offset"] + this.config["logo-size"];
            this.gc.translate(x,y);

            this.gc.font= this.config["font"];
            this.gc.fillStyle = this.config["text-color"];
            
            this.gc.fillText(this.caption, 0, 0);
        } finally {
            this.gc.restore();
        }
    }

    Cockpit.prototype.drawPie = function() {
        var color = this.config["urgency-colors"][this.urgency];
        var piecolor = this.config["percent-color"];

        var t = {
                "x" : this.width /2,
                "y" : this.height - (this.config["inset"] + this.config["logo-offset"])
            };
        var text = (this.percent) ? this.percent + " / " + this.volume : this.volume;

        var m = {
                "x" : this.width /2,
                "y" : this.height/2
            };
            
        var grad = (this.volume) ? Math.PI * 2 * this.percent / this.volume : 0;
        var trad = -Math.PI / 2;

        var volMax = this.config["volume-max"];
        var radMin = this.config["radius-min"];
        var radMax = Math.max(0, (Math.min(this.height, this.width) / 4 ) - (this.config["inset"])); 
        var radius = radMin + (radMax - radMin) * Math.min(this.volume, volMax )/ volMax;

        this.gc.save();
        try {
            this.gc.font= this.config["font"];
            this.gc.fillStyle = color;

            this.gc.textAlign = "center";
            this.gc.textBaseline = "bottom";
            this.gc.translate(t.x,t.y);
            this.gc.fillText(text, 0, 0);
        } finally {
            this.gc.restore();
        }

        this.gc.save();
        try {
            this.gc.textAlign = "center";
            this.gc.textBaseline = "bottom";
            this.gc.translate(m.x,m.y);
            
            this.gc.fillStyle = color;
            GCLIB.circlePart(this.gc, radius);
            this.gc.fill();
            
            this.gc.fillStyle = piecolor;
            GCLIB.circlePart(this.gc,radMax, grad);
            this.gc.fill();
        } finally {     
            this.gc.restore();
        }
    }
    
    
    
    // -------------------------------------------------------------------------
    //
    // Graphics convenience functions drawing certain shapes & used here and there.
    //
    // -------------------------------------------------------------------------
    
    var GCLIB = {};
    /** Draws a centered (ie at 0,0) circle/pie with the specified radius and width of the pie in radians. */
    GCLIB.circlePart = function(gc, rad, grad) {
        var start = 0;
        var end = Math.PI *2;
        gc.beginPath();
            if (grad != null) {
                gc.moveTo(0,0);
                gc.lineTo(0, rad);
                start = -Math.PI/2;
                end = start + grad;
            }
            gc.arc(0,0, rad, start, end, false);
        gc.closePath();
    }

    /** Draws a centered (ie at 0,0) rounded rectangle with the specified width, height and percentage of round-ness on the corners */
    GCLIB.roundedRect = function(gc, width, height, rdpcnt) {
        rdpcnt = rdpcnt || 0;

        var w = width/2;
        var h = height/2;
        var r = rdpcnt * Math.min(w,h);

        gc.beginPath();
            if (r) {
                gc.arc(-w + r, -h + r, r, -Math.PI  , -Math.PI/2, false);
                gc.arc( w - r, -h + r, r, -Math.PI/2, 0         , false);
                gc.arc( w - r,  h - r, r, 0         , Math.PI/2 , false);
                gc.arc(-w + r,  h - r, r, Math.PI/2 , Math.PI   , false);
            } else {
                gc.moveTo(-w, -h);
                gc.lineTo( w, -h);
                gc.lineTo( w,  h);
                gc.lineTo(-w,  h);
            }
        gc.closePath();
    }

})(jQuery);
