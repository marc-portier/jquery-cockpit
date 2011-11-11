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
        if (!work) return [0,1];
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
    // Common "BASE" class with reused static methods
    //
    // -------------------------------------------------------------------------
    
    function MeterBase() {
    }
    
    MeterBase.init = function(me, TheMeter, $elm) {
        me.$elm = $elm;
        me.gc = $elm.get(0).getContext('2d');

        me.height = $elm.height();
        me.width  = $elm.width();

        // check data
        var data = me.$elm.data("meter");
        var demo = false;
        if (data == "demo") {
            data = TheMeter.demoData(me);
            demo = true;
        }
        me.plot(data);

        // check refresh
        var refresh = me.$elm.data("refresh");
        var rate = toMillis(refresh.each);
        
        if (!refresh || rate <= 0) {
            return; // no refresh
        }
        // else init refresh
        var uri = refresh.uri;
        var updater;
        if (uri) {
            var onUpdate = function(data) {
                me.plot(data);
            }
            updater = function() {
                $.getJSON(uri, onUpdate);
            }
        } else if (demo) {
            updater = function() {
                me.plot(TheMeter.demoData(me));
            }
        }
        
        //register timer for updater.
        me.interval = setInterval( updater, rate);
    }

    MeterBase.stop = function(me) {
        if (me.interval)
            clearInterval(me.interval);
        me.interval = undefined;    
    }

    MeterBase.clear = function(me){
        me.gc.clearRect( 0, 0, me.width, me.height);
    }

    MeterBase.drawBackground = function(me) {
        var round = me.config["round"];
        var inset = me.config["inset"];
        
        me.gc.save();
        try {
            me.gc.fillStyle = me.config["background-fill"];
            me.gc.strokeStyle = me.config["background-stroke"];
            me.gc.lineWidth = me.config["background-border"];
            me.gc.translate(me.width/2, me.height/2); // center
            GCLIB.roundedRect(me.gc, me.width - 2*inset, 
                              me.height - 2*inset, round);
            me.gc.stroke();
            me.gc.fill();
        } finally {
            me.gc.restore();
        }
    }

    MeterBase.drawCaption = function(me) {
        var gc = me.gc;
        gc.save();
        try {
            gc.textAlign = "center";
            gc.textBaseline = "bottom";
            var x = me.width /2;
            var y = me.config["inset"] + me.config["caption-offset"];
            var dy = me.config["caption-linespace"];
            gc.translate(x,y);

            gc.font= me.config["font"];
            gc.fillStyle = me.config["text-color"];
            
            var lines = me.caption.split("\n");
            var i, last = lines.length;
            for (i=0; i<last; i++) {
                gc.fillText(lines[i], 0, 0);
                gc.translate(0, dy);
            }
        } finally {
            gc.restore();
        }
    }


    // -------------------------------------------------------------------------
    //
    // cockpit-meter
    //
    // -------------------------------------------------------------------------

    
    jqDefine("cockpit", Cockpit);
    
    function Cockpit($elm, config) {
        var logo = $("img", $elm).eq(0);
        this.logoUri = (logo) ? logo.attr("src") : "";
        // TODO check trick below: doesn't work on chrome, but does on ffx
        // this.logo = logo.get(0);
        
        this.config = jqMerge(Cockpit.config, config);
        MeterBase.init(this, Cockpit, $elm);
    }
    
    Cockpit.config = {
        "font"              : "50px Arial",
        "text-color"        : "rgba(0, 0, 0, 1.0)",
        "logo-size"         :  60,
        "logo-offset"       :  10,
        "caption-offset"    :  70,
        "caption-linespace" :  50,
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
    
    Cockpit.demoData = function(me) {

    	var data ={};
        var rndCaptions = [ "23-03", "24-04", "06-05", "21-07", "25-08",
         "30-08", "04-09", "17-09", "30-09", "17-10", "28-10", "01-11", "11-11",
         "15-11", "21-11", "06-12", "12-12", "24-12", "25-12", "28-12","31-12"];
        var rndUpx   = Math.random();
        data.slack   = Math.floor( rndUpx * me.config["urgency-colors"].length);
        data.at      = rndCaptions[ Math.floor(rndUpx * rndCaptions.length)];
        var volume  = Math.floor( Math.random() * me.config["volume-max"]);  
        var percent = Math.floor( Math.random() * volume);
        data.work   = percent  + "/" + volume;

        return data;
    }

    Cockpit.prototype.init = function() {


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
            this.gc.fillText("dim: " + this.width + "x" + this.height, 0,0);
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
        MeterBase.clear(this);
        MeterBase.drawBackground(this);
        MeterBase.drawCaption(this);
        this.drawLogo();
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
            GCLIB.roundedRect(this.gc, this.width - 2*inset, 
                              this.height - 2*inset, round);
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
    
    Cockpit.prototype.drawPie = function() {
        var color = this.config["urgency-colors"][this.urgency];
        var piecolor = this.config["percent-color"];

        var t = {
                "x" : this.width /2,
                "y" : this.height - 
                    (this.config["inset"] + this.config["logo-offset"])
            };
        var text = (this.percent) ? 
            this.percent + " / " + this.volume : this.volume;
        var m = {
                "x" : this.width /2,
                "y" : this.height/2
            };
            
        var grad = (this.volume) ? Math.PI * 2 * this.percent / this.volume : 0;
        var trad = -Math.PI / 2;

        var volMax = this.config["volume-max"];
        var radMin = this.config["radius-min"];
        var radMax = Math.max(0, (Math.min(this.height, this.width) / 4 ) - 
                                  this.config["inset"]); 
        var radius = radMin + (radMax - radMin) * 
                                Math.min(this.volume, volMax )/ volMax;

        var gc = this.gc;
        gc.save();
        try {
            gc.font= this.config["font"];
            gc.fillStyle = color;

            gc.textAlign = "center";
            gc.textBaseline = "bottom";
            gc.translate(t.x,t.y);
            gc.fillText(text, 0, 0);
        } finally {
            gc.restore();
        }

        gc.save();
        try {
            gc.textAlign = "center";
            gc.textBaseline = "bottom";
            gc.translate(m.x,m.y);
            
            gc.fillStyle = color;
            GCLIB.circlePart(gc, radius);
            gc.fill();
            
            gc.fillStyle = piecolor;
            GCLIB.circlePart(gc,radMax, grad);
            gc.fill();
        } finally {     
            gc.restore();
        }
    }
    



    // -------------------------------------------------------------------------
    //
    // exchange-indicator
    //
    // -------------------------------------------------------------------------

    
    jqDefine("exchange", ExchangeIndicator);
    
    function ExchangeIndicator($elm, config) {

        var icon = {};
        var iconUri = {};
        ExchangeIndicator.$ROLES.each(function() {
            var n = this;
            icon[n] = $("img." + n, $elm).eq(0);
            iconUri[n] = icon[n] ? icon[n].attr("src") : "";
        });
        
        this.config = jqMerge(ExchangeIndicator.config, config);
        MeterBase.init(this, ExchangeIndicator, $elm);
    }
    ExchangeIndicator.$ROLES =  $(["in", "ex", "out"]);
    ExchangeIndicator.config = {
        "font"              : "24px Arial",
        "text-color"        : "rgba(0, 0, 0, 1.0)",
        "logo-size"         :  60,
        "logo-offset"       :   0,
        "caption-offset"    :  28,
        "caption-linespace" :  24,
        "inset"             :   5,
        "round"             :   0.25,
        "background-fill"   : "rgba(200,200,100, 0.5)",
        "background-stroke" : "rgba(200,200,100, 0.8)",
        "background-border" :   0,
        "volume-max"        :  50,
        "grid-border"       :   1,
        "grid-style"        : "dashes",
        "in-fill"           : "rgba( 64,191,139, 0.5)",
        "in-stroke"         : "rgba( 64,191,139, 0.8)",
        "in-border"         :   1,
        "ex-fill"           : "rgba(149,125,160, 0.5)",
        "ex-stroke"         : "rgba(149,125,160, 0.8)",
        "ex-border"         :   1,
        "out-fill"          : "rgba( 25,247,157, 0.5)",
        "out-stroke"        : "rgba( 25,247,157, 0.8)",
        "out-border"        :   1,
        "done-fill"         : "rgba(200,200,200, 0.2)",
        "done-stroke"       : "rgba(200,200,200, 0.2)",
        "done-border"       :   1
    }
    
    ExchangeIndicator.demoData = function(me) {

    	var data ={};
        var titles = [ "ma\n23-03", "di\n24-04", "wo\n06-05", "do\n21-07",
         "vr\n25-08", "za\n30-08", "zo\n04-09", "ma\n17-09", "di\n30-09",
         "wo\n17-10", "do\n28-10", "vr\n01-11", "za\n11-11", "zo\n15-11",
         "ma\n21-11", "di\n06-12", "wo\n12-12", "do\n24-12", "vr\n25-12"];
        var titleNdx = Math.floor(Math.random() * titles.length);
        data.title  = titles[ titleNdx ];
        var inVol   = Math.floor( Math.random() * me.config["volume-max"]);  
        var outVol  = Math.floor( Math.random() * me.config["volume-max"]);
        // exchange volume at most smallest of in&out volumes
        var exVol   = Math.floor(Math.random() * Math.min(inVol, outVol));
        var inDone  = Math.floor( Math.random() * inVol);
        var outDone = Math.floor( Math.random() * outVol);
        // exchange done at most smallest of volume and out-done
        var exDone  = Math.floor( Math.random() * Math.min(outDone, exVol));
        data.in   = inDone  + "/" + inVol;
        data.ex   = exDone  + "/" + exVol;
        data.out  = outDone + "/" + outVol;

        return data;
    }

    ExchangeIndicator.prototype.plot = function(data) {
        var me = this;
        ExchangeIndicator.$ROLES.each(function() {
            var n = this;
            var work = toProgressArray(data[n]);
            me[n+"_volume"] = work[1];
            me[n+"_done"]   = work[0];
        });
        this.caption = data.title;
        this.draw();
    }

    ExchangeIndicator.prototype.draw = function() {
        MeterBase.clear(this);
        MeterBase.drawBackground(this);
        MeterBase.drawCaption(this);
    }
    
    ExchangeIndicator.prototype.debug = function() {
        var gc = this.gc;
        gc.save();
        try {
            gc.font= "20px Optimer";
            gc.fillStyle = "rgba(0, 0, 0, 0.5)";
            
            gc.fillRect(0,0,10,10);
            gc.translate(0,30);
            gc.fillText("dim: " + this.width + "x" + this.height, 0,0);
            gc.translate(0,20);
            gc.fillText("text-color: " + this.config["text-color"], 0, 0);
            gc.translate(0,20);
            gc.fillText("title: " + this.title, 0, 0);
            gc.translate(0,20);
            gc.fillText("in: " + this.in_done + "/" + this.in_volume, 0, 0);
            gc.translate(0,20);
            gc.fillText("ex: " + this.ex_done + "/" + this.ex_volume, 0, 0);
            gc.translate(0,20);
            gc.fillText("out:" + this.out_done + "/" + this.out_volume, 0, 0);
        } finally {
            gc.restore();
        }
    }
    
    
    
    // -------------------------------------------------------------------------
    //
    // Graphics convenience functions drawing certain shapes 
    //
    // -------------------------------------------------------------------------
    
    var GCLIB = {};
    /** Draws a centered (ie at 0,0) circle/pie with the specified radius 
     *  and angle of the pie in radians. 
     */
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

    /** Draws a centered (ie at 0,0) rounded rectangle with the specified width,
     *  height and percentage of round-ness on the corners 
     */
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
