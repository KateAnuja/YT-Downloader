import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { AlertController, IonInput } from '@ionic/angular';
import { Playlist } from '../model/playlist';
import { MusicTrackService } from '../services/music-track.service';
import { Router } from '@angular/router';
import { Constants } from '../util/constants';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.page.html',
  styleUrls: ['./playlist.page.scss'],
})
export class PlaylistPage {
  public static TAG : string = "PlaylistPage";
  playlistArray = [];
  playlist = Constants.STRING_EMPTY_STRING;
  favouritesCount =0;
  favPlaylistString=Constants.STRING_PLAYLIST_FAV;
  isOpen = false;
  playlistInput="";
  filteredPlaylistArray = [];

  @ViewChild("playlistInputSearch",{static:false}) playlistInputSearch:IonInput;
  
  constructor(
    private router : Router,
    private musicTrackService : MusicTrackService,
    private chnageDetector : ChangeDetectorRef,
    private alertController : AlertController,
    private changeDetector : ChangeDetectorRef,
  ) { 
    this.musicTrackService.playListUpdatedBehaviourSubject.subscribe((playListrUpdated)=>{
      if(playListrUpdated){
        this.getPlaylist();
      }
    })
  }

  ionViewWillEnter(){
    this.getPlaylist();
  }
  
  ionViewDidEnter(){
    
  }

  ionViewWillLeave(){
  }

  ionViewDidLeave(){

  }

  async getPlaylist(){
    this.playlistArray= await this.musicTrackService.getPlaylist();
    this.filteredPlaylistArray=this.playlistArray;
    this.playlist=Constants.STRING_EMPTY_STRING;
    this.favouritesCount=await this.musicTrackService.getFavCount();
    this.chnageDetector.detectChanges();
  }

  async addNewPlaylist(playlistName : string){
    await this.musicTrackService.addNewPlaylist(playlistName);
    this.musicTrackService.playListUpdatedBehaviourSubject.next(true);
  }

  async deletePlaylist(playlistObj:Playlist){
    if(playlistObj.count > 1){
      const alert = await this.alertController.create({
        header: 'Warning',
        message: `Are you sure to delete 
                  ${playlistObj.name} 
                  having ${playlistObj.count} songs?`
                  .replace(/\n/gi,'').replace(/\t/gi,''),
        buttons: [
          {
              text: 'DELETE',
              cssClass : "alert-btn-danger",
              handler: async() => {
                await this.musicTrackService.deletePlaylist(playlistObj);
                this.musicTrackService.playListUpdatedBehaviourSubject.next(true);
              }
          },{
              text: 'CANCEL',
              cssClass : "primary",
              handler: async() => {
                
              }
          },
        ]
      });
      alert.present();
    }else{
      await this.musicTrackService.deletePlaylist(playlistObj);
    }
    this.getPlaylist();
  }

  openPlaylist(playlistName:string){
    this.router.navigate([`/local-music/${playlistName}`])
  }

  toggleSearchBar(){
    this.isOpen = !this.isOpen;
    if(this.isOpen){
      this.playlistInputSearch.setFocus();
    }
  }

  searchPlaylist(){
    let filteredPlaylistArray = [];
      if(this.playlistInput!=""){
        this.playlistInput=this.playlistInput.toLowerCase();
        this.playlistArray.forEach((playlist)=>{
          if(playlist.name.toLowerCase().indexOf(this.playlistInput) != -1){
            filteredPlaylistArray.push(playlist);
          }
        })
      }else{
        filteredPlaylistArray=this.playlistArray;
      }
      this.filteredPlaylistArray = filteredPlaylistArray;     
      this.changeDetector.detectChanges();
  }

}
