import { Component, ViewChild, ElementRef,ChangeDetectorRef  } from '@angular/core';
import { NavController, NavParams} from 'ionic-angular';
import { TransactionService } from '../../providers/transaction-service';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

	@ViewChild('map') mapElement: ElementRef;
  	map: any;
  	directionsRender: any;
  	directionsService: any;
  	isLoadPage=true;
  	isFound=false;
  	showTittle=false;
  	titlePage;
  	cost;
  	Alocation;
  	Blocation;
  	distance;
  	vehicleType;

  	constructor(public navCtrl: NavController,public navParams: NavParams,private transactionService: TransactionService,private cd: ChangeDetectorRef) {
  		this.distance=0;
  		this.titlePage="Logibot";
	}
  	ionViewDidLoad(){
		this.getTransaction();
	}

	getTransaction(){
		const key=this.getParameterByName('key');
		if(key==null) {
			this.isLoadPage=false;
			this.titlePage="Transaction is not found";
			this.showTittle=true;
			return;
		}
		const data={type:"get",key:key};
  		this.transactionService.getTransaction(data).subscribe(trx=>{
  			if(trx.result=="notfound"){
  				this.titlePage="Transaction is not found";
  				this.isLoadPage=false;
  				this.showTittle=true;
  			} else if(trx.result=="found"){
  				this.titlePage="Please route me your customer location, "+trx.data.name;
  				this.vehicleType=trx.data.slots.vehicleType;
				this.loadMap(trx.data);
  			}
  			this.cd.detectChanges();
  		},e=>{
        	this.isLoadPage=false;
        	this.showTittle=true;
        	this.cd.detectChanges();
        	console.log(e);
      });
  	}
	 
	loadMap(data){
		let mapOptions = {
			mapTypeId: google.maps.MapTypeId.ROADMAP
	    }
	 	this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
	 	this.directionsRender = new google.maps.DirectionsRenderer( {'draggable':true});
		this.directionsService = new google.maps.DirectionsService();
		this.directionsRender.setMap(this.map);
		let self=this;
		this.directionsService.route({
		    origin: data.slots.pickupCityAddress,
	      	destination: data.slots.deliverCityAddress,
	      	travelMode: google.maps.TravelMode.DRIVING
		}, function(response, status) {
		    if (status == google.maps.DirectionsStatus.OK) {
		        self.directionsRender.setDirections(response);
    			
	        } else {
	            window.alert('Directions request failed due to ' + status);
	        }
		});
		this.directionsRender.addListener('directions_changed', function() {
          	self.computeTotalDistance(self.directionsRender.getDirections());
        });

	}

	placeOrder(){
		console.log(this.directionsRender.getDirections());
		console.log(this.directionsRender.getDirections().routes[0].legs[0].start_location.lat());
		console.log(this.directionsRender.getDirections().routes[0].legs[0].start_location.lng());
		const routes=this.directionsRender.getDirections().routes[0].legs[0];
		const data={
			type:"post",
			distance:this.distance,
			cost:this.cost,
			start_address:routes.start_address,
			end_address:routes.end_address,
			start_point:[routes.start_location.lat(),routes.start_location.lng()],
			end_point:[routes.end_location.lat(),routes.end_location.lng()],
			waypoints:this.directionsRender.getDirections().routes[0].overview_polyline
		}
		console.log(data);
	}

	computeTotalDistance(result) {
        let total = 0,min=2;
        const curroute = result.routes[0];
        for (let i = 0; i < curroute.legs.length; i++) {
          total += curroute.legs[i].distance.value;
        }
        total = total / 1000;
        this.distance=total;
        this.Alocation=curroute.legs[0].start_address;
        this.Blocation=curroute.legs[0].end_address;
        this.isFound=true;
        this.isLoadPage=false;
        this.showTittle=true;
        if(this.vehicleType=='motorcycle') {this.cost=(total*0.2).toFixed(2);min=2}
        else if(this.vehicleType=='pickup truck') {this.cost=(total*0.5).toFixed(2);min=5;}
        else if(this.vehicleType=='box truck') {this.cost=(total*0.8).toFixed(2);min=8;}
        //minimum 
        if(this.cost<=min) this.cost=min;
        this.cd.detectChanges();
     }

	getParameterByName(name) {
	    var url = window.location.href;
	    name = name.replace(/[\[\]]/g, "\\$&");
	    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	        results = regex.exec(url);
	    if (!results) return null;
	    if (!results[2]) return '';
	    return decodeURIComponent(results[2].replace(/\+/g, " "));
	}



}
