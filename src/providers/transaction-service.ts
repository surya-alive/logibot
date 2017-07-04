import { Injectable } from '@angular/core';
import { Http,Headers,RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';


@Injectable()
export class TransactionService {

  headers;
  options;
  trxUrl="https://nuf9puwtr1.execute-api.us-east-1.amazonaws.com/prod/web-uri";
  constructor(public http: Http) {
    
  }

  setHeaderJson(){
  	let headers = new Headers();
	headers.append('Accept', 'application/json');
	return new RequestOptions({ headers: headers });
  }

  getTransaction(data){
  	return this.http.post(this.trxUrl,data,this.setHeaderJson()).map(res =>  res.json());
  }


}
