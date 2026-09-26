// You can the URL ptb.discord.com to canary.discord.com or discord.com based on your liking

import System;
import System.Web;
import System.Windows.Forms;
import Fiddler;

class Handlers
{
    static function OnBeforeRequest(oSession: Session)
    {
        if (oSession.HTTPMethodIs("CONNECT"))
            return;

        if (oSession.fullUrl.Contains("rotterdam11006.discord.media"))
            oSession.fullUrl = "http://25.77.65.93:6967/voicews";

        if (oSession.fullUrl.Contains("/gateway.discord.gg"))
            oSession.fullUrl = "http://25.77.65.93:6968" + oSession.PathAndQuery;

        if (oSession.fullUrl.Contains("ptb.discord.com/api") || oSession.fullUrl.Contains("ptb.discord.com/__development"))
            oSession.fullUrl = "http://25.77.65.93:6969" + oSession.PathAndQuery;

        if (oSession.fullUrl.Contains("cdn.discordapp.com"))
            oSession.fullUrl = "http://25.77.65.93:6969/cdn" + oSession.PathAndQuery;

        if (oSession.hostname.Contains("25.77.65.93") && oSession.isHTTPS)
            oSession.fullUrl = "http://25.77.65.93:" + oSession.port + oSession.PathAndQuery;

        if (oSession.fullUrl.Contains("discordsays.com"))
            oSession.fullUrl = "http://25.77.65.93:6969/discordsays/" + oSession.hostname.Split(".")[0] + oSession.PathAndQuery;
    }
}