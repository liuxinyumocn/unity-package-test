using System;
using System.IO;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEditor;

[InitializeOnLoad]
internal sealed class UnityVersionChecker
{
    public const string m_PackageName = "com.unity.instantgame";

    static UnityVersionChecker()
    {
        AssemblyReloadEvents.afterAssemblyReload += CheckUnityVersion;
#if !IG_C111 && !IG_C301
        RemovePackageInstantGame("com.unity.autostreaming");
        RemovePackageInstantGame("com.unity.autostreaming.UOS");
#endif
    }

    static void CheckUnityVersion()
    {
#if !IG_C111 && !IG_C301
        RemovePackageInstantGame(m_PackageName);
        EditorUtility.DisplayDialog("The versions of Unity and package Instant Game are incompatible", "Package Instant Game won't be installed", "OK");
#endif
    }

    static void RemovePackageInstantGame(string pkgName)
    {
        var dirDelim = Path.DirectorySeparatorChar;
        var packagesManifestPath = $"Packages{dirDelim}manifest.json";

        try
        {
            string json;
            using (var reader = new StreamReader(packagesManifestPath))
            {
                json = reader.ReadToEnd();
            }

            var jsonObj = JObject.Parse(json);
            var deps = (JObject)jsonObj.SelectToken("dependencies");
            deps.Property(pkgName)?.Remove();

            json = jsonObj.ToString();
            using (var writer = new StreamWriter(packagesManifestPath))
            {
                writer.Write(json);
            }
        }
        catch (Exception e)
        {
            Debug.LogError($"Fail to remove package {pkgName}, error: {e}");
        }
    }
}
