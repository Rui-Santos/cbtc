

if(!Function.prototype.inheritsFrom){
	Function.prototype.inheritsFrom = function (parentClassOrObject){
		this.prototype=new parentClassOrObject;
		this.prototype.constructor = this;
		this.prototype.parent = parentClassOrObject.prototype;
	};
}

/*
 * Base class for Drawing Tools. Use inheritsFrom() to build a subclass for custom drawing tools.
 * The name of the subclass should be STX.Drawing.yourname. Whenever STXChart.vectorType==yourname, then
 * your drawing tool will be the one that is enabled when the user begins a drawing. Capitalization of yourname
 * must be an exact match otherwise ther kernel will not be able to find your drawing tool.
 * 
 * Each of the STX.Drawing prototype functions may be overridden. To create a functioning drawing tool
 * you must override the functions below that create alerts.
 * 
 * Drawing clicks are always delivered in *adjusted price*. That is, if a stock has experienced splits then
 * the drawing will not display correctly on an unadjusted price chart unless this is considered during the rendering
 * process. Follow the templates to assure correct rendering under both circumstances.
 */
STX.Drawing=function (){};

STX.Drawing.prototype.abort=function(forceClear){};
STX.Drawing.prototype.measure=function(){};
STX.Drawing.prototype.construct=function(stx, panelName){
	this.stx=stx;
	this.panelName=panelName;
};
STX.Drawing.prototype.render=function(context)					{alert("must implement render function!");};
STX.Drawing.prototype.click=function(context, tick, value)		{alert("must implement click function!");};
STX.Drawing.prototype.move=function(context, tick, value)		{alert("must implement move function!");};
STX.Drawing.prototype.intersected=function(tick, value, box)	{alert("must implement intersected function!");};
STX.Drawing.prototype.reconstruct=function(stx, obj)				{alert("must implement reconstruct function!");};
STX.Drawing.prototype.serialize=function()						{alert("must implement serialize function!");};
STX.Drawing.prototype.adjust=function()							{alert("must implement adjust function!");};

/*
 * Base class for drawings that require two mouse clicks. Override
 */
STX.Drawing.BaseTwoPoint=function(){
	this.p0=null;
	this.p1=null;
	this.color="";
	this.panelName="chart";
};

STX.Drawing.BaseTwoPoint.inheritsFrom(STX.Drawing);

// Override this function to copy all of the config necessary to render your drawing
STX.Drawing.BaseTwoPoint.prototype.copyConfig=function(){
	this.color=STXChart.currentColor;
};

STX.Drawing.BaseTwoPoint.prototype.highlight=function(highlighted){	// return true if the highlighting status changes
	if(this.highlighted!=highlighted){
		this.highlighted=highlighted;
		return true;
	}
	return false;
};

// Intersection is based on a hypothetical box that follows a user's mouse or finger around
// An intersection occurs when either the box crosses over the drawing.The type should be "segment", "ray" or "line" depending on whether
// the drawing extends infinitely in any or both directions. radius determines the size of the box in pixels and is
// determined by the kernel depending on the user interface (mouse, touch, etc)

STX.Drawing.BaseTwoPoint.prototype.lineIntersection=function(tick, value, box, type){
	if(this.stx.layout.semiLog){
		return boxIntersects(box.x0, STX.log10(box.y0), box.x1, STX.log10(box.y1), this.p0[0], STX.log10(this.p0[1]), this.p1[0], STX.log10(this.p1[1]), type);		
	}else{
		return boxIntersects(box.x0, box.y0, box.x1, box.y1, this.p0[0], this.p0[1], this.p1[0], this.p1[1], type);
	}
};

STX.Drawing.BaseTwoPoint.prototype.boxIntersection=function(tick, value){
	if(tick>Math.max(this.p0[0], this.p1[0]) || tick<Math.min(this.p0[0], this.p1[0])) return false;
	if(value>Math.max(this.p0[1], this.p1[1]) || value<Math.min(this.p0[1], this.p1[1])) return false;
	return true;		
};

STX.Drawing.BaseTwoPoint.prototype.click=function(context, tick, value){
	this.copyConfig();
	if(!this.p0){
		this.p0=[tick,value];
		return false;
	}
	this.p1=[tick,value];
	this.d0=this.stx.dateFromTick(this.p0[0]);
	this.d1=this.stx.dateFromTick(this.p1[0]);

	return true;	// kernel will call render after this
};

STX.Drawing.BaseTwoPoint.prototype.adjust=function(){
	this.p0[0]=this.stx.tickFromDate(this.d0);
	this.p1[0]=this.stx.tickFromDate(this.d1);
};

STX.Drawing.BaseTwoPoint.prototype.move=function(context, tick, value){
	this.copyConfig();
	this.p1=[tick,value];
	this.render(context);
};

STX.Drawing.BaseTwoPoint.prototype.measure=function(){
	this.stx.setMeasure(this.p0[1], this.p1[1], this.p0[0], this.p1[0]);	
};


STX.Drawing.segment=function(){
	this.name="segment";
};

STX.Drawing.segment.inheritsFrom(STX.Drawing.BaseTwoPoint);

STX.Drawing.segment.prototype.render=function(context){
	var panel=this.stx.panels[this.panelName];
	var x0=this.stx.pixelFromTick(this.p0[0]);
	var x1=this.stx.pixelFromTick(this.p1[0]);
	var y0=this.stx.pixelFromValueAdjusted(panel, this.p0[0], this.p0[1]);
	var y1=this.stx.pixelFromValueAdjusted(panel, this.p1[0], this.p1[1]);
	
	var color=this.color;
	if(this.highlighted){
		color=this.stx.getCanvasColor("stx_highlight_vector");		
	}
	
	var parameters={
			pattern: this.pattern,
			lineWidth: this.lineWidth
	};

	this.stx.plotLine(x0, x1, y0, y1, color, this.name, context, true, parameters);
};


STX.Drawing.segment.prototype.intersected=function(tick, value, box){
	return this.lineIntersection(tick, value, box, this.name);
};

STX.Drawing.segment.prototype.copyConfig=function(){
	this.color=STXChart.currentColor;
	this.lineWidth=STXChart.currentVectorParameters.lineWidth;
	this.pattern=STXChart.currentVectorParameters.pattern;		
};

STX.Drawing.segment.prototype.reconstruct=function(stx, obj){
	this.stx=stx;
	this.color=obj["col"];
	this.panelName=obj["pnl"];
	this.pattern=obj["ptrn"];
	this.lineWidth=obj["lw"];
	this.d0=obj["d0"];
	this.d1=obj["d1"];
	this.p0=[this.stx.tickFromDate(this.d0),obj["v0"]];
	this.p1=[this.stx.tickFromDate(this.d1),obj["v1"]];
};

STX.Drawing.segment.prototype.serialize=function(){
	return {
		name:this.name,
		pnl: this.panelName,
		col:this.color,
		ptrn:this.pattern,
		lw:this.lineWidth,
		d0:this.d0,
		d1:this.d1,
		v0:this.p0[1],
		v1:this.p1[1]
	};
};



STX.Drawing.rectangle=function(){
	this.name="rectangle";
};

STX.Drawing.rectangle.inheritsFrom(STX.Drawing.BaseTwoPoint);

STX.Drawing.rectangle.prototype.render=function(context){
	var panel=this.stx.panels[this.panelName];
	var x0=this.stx.pixelFromTick(this.p0[0]);
	var x1=this.stx.pixelFromTick(this.p1[0]);
	var y0=this.stx.pixelFromValueAdjusted(panel, this.p0[0], this.p0[1]);
	var y1=this.stx.pixelFromValueAdjusted(panel, this.p1[0], this.p1[1]);
	
	var x=Math.round(Math.min(x0, x1))+.5;
	var y=Math.min(y0, y1);
	var width=Math.max(x0,x1)-x;
	var height=Math.max(y0, y1)-y;
	var edgeColor=this.color;
	if(this.highlighted){
		edgeColor=this.stx.getCanvasColor("stx_highlight_vector");
	}
	
	var fillColor=this.fillColor;
	if(fillColor && !STX.isTransparent(fillColor) && fillColor!="auto"){
		context.beginPath();
		context.rect(x, y, width, height);
		context.fillStyle=fillColor;
		context.globalAlpha=.2;
		context.fill();
		context.closePath();
		context.globalAlpha=1;
	}
	
	var parameters={
			pattern: this.pattern,
			lineWidth: this.lineWidth
	};
	if(this.highlighted && parameters.pattern=="none"){
		parameters.pattern="solid";
		if(parameters.lineWidth==.1) parameters.lineWidth=1;
	}

	// We extend the vertical lines by .5 to account for displacement of the horizontal lines
	// HTML5 Canvas exists *between* pixels, not on pixels, so draw on .5 to get crisp lines
	this.stx.plotLine(x0, x1, y0, y0, edgeColor, "segment", context, true, parameters);
	this.stx.plotLine(x1, x1, y0-.5, y1+.5, edgeColor, "segment", context, true, parameters);
	this.stx.plotLine(x1, x0, y1, y1, edgeColor, "segment", context, true, parameters);
	this.stx.plotLine(x0, x0, y1+.5, y0-.5, edgeColor, "segment", context, true, parameters);		
};


STX.Drawing.rectangle.prototype.intersected=function(tick, value){
	return this.boxIntersection(tick, value);
};

STX.Drawing.rectangle.prototype.copyConfig=function(){
	this.color=STXChart.currentColor;
	this.fillColor=STXChart.currentVectorParameters.fillColor;
	this.lineWidth=STXChart.currentVectorParameters.lineWidth;
	this.pattern=STXChart.currentVectorParameters.pattern;		
};

STX.Drawing.rectangle.prototype.reconstruct=function(stx, obj){
	this.stx=stx;
	this.color=obj["col"];
	this.fillColor=obj["fc"];
	this.panelName=obj["pnl"];
	this.pattern=obj["ptrn"];
	this.lineWidth=obj["lw"];
	this.d0=obj["d0"];
	this.d1=obj["d1"];
	this.p0=[this.stx.tickFromDate(this.d0),obj["v0"]];
	this.p1=[this.stx.tickFromDate(this.d1),obj["v1"]];
};

STX.Drawing.rectangle.prototype.serialize=function(){
	return {
		name:this.name,
		pnl: this.panelName,
		col:this.color,
		fc:this.fillColor,
		ptrn:this.pattern,
		lw:this.lineWidth,
		d0:this.d0,
		d1:this.d1,
		v0:this.p0[1],
		v1:this.p1[1]
	};
};









