import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Plugins } from '@capacitor/core';
import { FileTransfer, FileTransferObject } from '@ionic-native/file-transfer/ngx';
import { File } from '@ionic-native/file/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { IonInput, IonRange } from '@ionic/angular';
import { Constants } from '../util/constants';
import { AlertController, ToastController } from '@ionic/angular';
import { NetworkService } from '../services/network.service';
import { MusicTrackService } from '../services/music-track.service';
import { MusicTrack } from '../model/track';
import { Media } from '@ionic-native/media/ngx';


const { IonicPlugin } = Plugins;

interface SearchData{
  title:string,
  videoId:string,
  thumbnail:string,
  duration:string
}

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
})
export class SearchPage implements OnInit {
  public static TAG : string = "SearchPage";
  @ViewChild("searchInput",{static:false})searchInput:IonInput;
  @ViewChild('range', {static : false}) range : IonRange;
  bufferClipBoard:string=Constants.STRING_EMPTY_STRING;
  suggestionArray:string[]=[];
  searchResultArray:SearchData[]=[];
  downloadPercentage : number = 0;
  imgName : any;
  imgSrc : any;
  url : string="";
  progress = 0;
  isInitialLoad = false;
  showProgressBar = false;
  isPreparingForDownload = false;

  constructor(
    private http: HTTP,
    private changeDetector:ChangeDetectorRef,
    private transfer: FileTransfer, 
    private file: File,
    private toast : ToastController,
    private alert : AlertController,
    private networkService : NetworkService,
    private musicTrackService : MusicTrackService,
    private media : Media,
    private activatedRoute : ActivatedRoute,
    private router : Router

  ) { }

  ngOnInit() {
  }
  async ionViewWillEnter(){
    if(this.router.url.indexOf("/download")!=-1){
      let videoId=this.router.url.replace("/search/download/","");
      this.isInitialLoad=true;
      this.scrapY2Mate(videoId);
    }
    if(this.router.url.indexOf("/search/init") != -1){
      this.isInitialLoad = true;
      let currentYear = +new Date().getFullYear();
      this.getSearchResults(Constants.STRING_INITIAL_LOAD_SEARCH+currentYear);
    }
    
  }
  
  ionViewDidEnter(){
    this.searchInput.setFocus();
  }

  searchTerm(){
    let termString:string=(this.searchInput.value+Constants.STRING_EMPTY_STRING).trim();
    this.suggestionArray=[];
  
    if(termString.length>0 && termString!=this.bufferClipBoard){
      this.getSuggestion(termString);
    }
  }

  async getSuggestion(term:string){
    this.bufferClipBoard=Constants.STRING_EMPTY_STRING;
    let suggestionArray:any=[];
    try{
      suggestionArray=await this.networkService.getSuggestion(term);
    }catch(err){

    }
    this.suggestionArray=[...suggestionArray];
    this.changeDetector.detectChanges();
  }

  async getSearchResults(term:string){
    this.suggestionArray=[];
    this.searchResultArray=[];
    this.bufferClipBoard=term;
    this.searchInput.value=term;
    let searchResultArray:any=[];
    try{
      searchResultArray=await this.networkService.getSearchResults(term);
    }catch(err){

    }
    this.searchResultArray=[...searchResultArray];
    this.changeDetector.detectChanges();
  }

  downloadVideo(videoId:string){
    this.searchResultArray=[];
    this.searchInput.value="";
    this.isPreparingForDownload=true;
    this.scrapY2Mate(videoId);
  }
  async verifyUrl(){
    let videoid = this.url.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);
    if(videoid != null){
      this.downloadPercentage=0.01;
      this.showProgressBar=true;
      this.scrapY2Mate(videoid[1].toString());
    }else{ 
      const alert = await this.alert.create({
        header: 'Ohh No...',
        message: 'Please Enter Valid YouTube URL.',
        buttons: ['OK']
      });
  
       alert.present();
    }
  }

  currentlyDownloading="";
  async scrapY2Mate(vid:string){
    console.log("scrapY2Mate",+new Date());
    console.log("currentlyDownloading",this.currentlyDownloading);
    console.log("vid",vid);
    if(this.currentlyDownloading!=vid){
      this.currentlyDownloading=vid;
      try{
        let {kid,fileName}=await this.getVideoKid(vid);
        console.log("getVideoKid",+new Date());

        this.isPreparingForDownload=false;
        this.showProgressBar=true;
        if(this.downloadPercentage != 0){
          this.downloadPercentage+=0.04;
        }else{
          this.downloadPercentage+=0.05;
        }
        let downloadUrl:string=await this.networkService.getDownloadUrl(kid,vid);
        console.log("downloadUrl",+new Date());

        this.downloadPercentage+=0.05;
        this.downloadFromUrl(downloadUrl,fileName);
      }catch(err){
        console.error(err)
        this.currentlyDownloading="";
        this.scrapY2Mate(vid)
      }
    }
    
  }

  async getVideoKid(vid:string):Promise<{kid:string,fileName:string}>{
    console.log("getVideoKid:1");
    let videoKidObj:any=await this.networkService.getVideoKid(vid);
    console.log("getVideoKid:2");
    
    this.imgName=videoKidObj.fileName;
    this.imgSrc=videoKidObj.thumbnailUrl;
    return videoKidObj;
  }

  async showSuccessToast(){
    const toast = await this.toast.create({
      message: 'Downloaded Successfully',
      duration: 2000
    });
    toast.present();
    console.log("showSuccessToast",+new Date());
    
    this.musicTrackService.musicTrackAddedBehaviourSubject.next(true);
    if(this.isInitialLoad){
      this.router.navigateByUrl('home');
    }

  }

  lastUpdateValue=0;
  lastProgress=0;
  async downloadFromUrl(downloadUrl:string,fileName:string){
    console.log("downloadFromUrl",+new Date());

    const fileTransfer: FileTransferObject = this.transfer.create();
    if(fileName.length<1){
      fileName=+new Date()+".mp3";
    }

    fileTransfer.onProgress((event)=>{
      let progress = ((((event.loaded * 100)/event.total)*0.9)+10)/100;
      if(this.lastProgress<progress){
        this.lastProgress=progress;
      }
      if(this.lastUpdateValue<progress){
        this.lastUpdateValue=progress+0.2;
        this.downloadPercentage=this.lastProgress;
        this.changeDetector.detectChanges(); 
      }
       
    })
    await this.file.createDir(this.file.externalCacheDirectory, "Music", true);
    console.log("downloadFromUrl,createDir",+new Date());

    fileTransfer.download(
      encodeURI(downloadUrl), 
      this.file.externalCacheDirectory + '/Music/' + fileName
    ).then(async (entry) => {
        console.log("fileTransfer.download",+new Date())
        IonicPlugin.download({fileName});
        this.url="";
        this.currentlyDownloading="";
        this.downloadPercentage=0;
        this.showProgressBar=false;
        this.lastUpdateValue=0;
        this.lastProgress=0;
        
        let musicTrack : MusicTrack = {
          name : fileName.replace(/.mp3/g,"").replace(/-/g," "),
          duration : 0,
          path : entry.nativeURL,
          thumbnail : this.imgSrc,
          playlist : [],
          isFavourite : false,
          addedTimeStamp : +new Date()
        }
        let audio=this.media.create(musicTrack.path.replace(/^file:\/\//,''));
        audio.setVolume(0);
        audio.play();
        let _count=0;
        let _int=setInterval(()=>{
          _count++;
          if(_count>20){
            this.musicTrackService.saveTrack(musicTrack);
            audio.setVolume(1);
            audio.stop();
            this.showSuccessToast();
            clearInterval(_int);
          }else{
            musicTrack.duration=audio.getDuration();
            if(musicTrack.duration>0){
              this.musicTrackService.saveTrack(musicTrack);
              audio.setVolume(1);
              audio.stop();
              this.showSuccessToast();
              clearInterval(_int);
            }
          }
        },100);
        
        
    }, (error) => {
        console.error('error...', error);
      this.showError();

    }).catch((err)=>{
      console.error(err);
      this.showError();
    })
  }

  async showError(){
    this.url="";
    this.currentlyDownloading="";
    this.downloadPercentage=0;
    this.showProgressBar=false;
    this.lastUpdateValue=0;
    this.lastProgress=0;
    const toast = await this.alert.create({
      message: 'Ohh no.. An error occured. Try again!',
      buttons: [
        {
          text:"OK",
          role:'cancel',
          handler:()=>{

          }
        }
      ]
    });
    toast.present();
  }
}
