import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentStudio from './ContentStudio';

const draft={id:1,title:'Bridal Mix N’ Sip',caption:'Cheers to the bride!',platform:'instagram',status:'draft',media_id:2,mime:'video/mp4',media_name:'mix.mp4'};
beforeEach(()=>{
  window.fetch=jest.fn(async(url,options={})=>{
    if(url.endsWith('/config')) return {ok:true,json:async()=>({instagramReady:false,canPublish:false})};
    if(url.endsWith('/posts') && !options.method) return {ok:true,json:async()=>[draft]};
    if(url.includes('/media/')) return {ok:false};
    return {ok:true,json:async()=>({...draft,status:'draft'})};
  });
  window.scrollTo=jest.fn();
});
test('disables Instagram publishing until configured without blocking preparation',async()=>{
  render(<ContentStudio/>);
  await screen.findByText('Bridal Mix N’ Sip');
  expect(screen.getByRole('button',{name:'Publish now'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Edit draft'})).toBeEnabled();
  expect(screen.getByText(/TikTok times are posting plans/)).toBeInTheDocument();
});
test('reuse shares assets while allowing a separate TikTok caption',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  fireEvent.click(screen.getByRole('button',{name:'Reuse for TikTok'}));
  expect(screen.getByLabelText('Platform')).toHaveValue('tiktok');
  fireEvent.change(screen.getByLabelText('Caption'),{target:{value:'Shake, sip, celebrate!'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/posts'),expect.objectContaining({method:'POST'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
  const call=window.fetch.mock.calls.find(([,options])=>options?.method==='POST');
  expect(JSON.parse(call[1].body)).toMatchObject({platform:'tiktok',media_id:2,caption:'Shake, sip, celebrate!'});
});
test('editing updates the existing draft instead of making another one',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  fireEvent.click(screen.getByRole('button',{name:'Edit draft'}));
  fireEvent.change(screen.getByLabelText('Caption'),{target:{value:'Updated caption'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/posts/1'),expect.objectContaining({method:'PUT'})));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
});
afterEach(()=>{jest.restoreAllMocks();});
test('allows videos over 50 MB and rejects videos over 1 GB before uploading',async()=>{
  render(<ContentStudio/>);await screen.findByText('Bridal Mix N’ Sip');
  const video=new File(['video'],'clip.mp4',{type:'video/mp4'});Object.defineProperty(video,'size',{value:60*1024*1024});
  fireEvent.change(screen.getByLabelText('Photo or video'),{target:{files:[video]}});
  await screen.findByText('Media uploaded. You can reuse it for both platforms.');
  expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/media'),expect.objectContaining({method:'POST',body:expect.any(FormData)}));
  const oversized=new File(['video'],'large.mp4',{type:'video/mp4'});Object.defineProperty(oversized,'size',{value:1_000_000_001});
  fireEvent.change(screen.getByLabelText('Photo or video'),{target:{files:[oversized]}});
  await screen.findByText('Choose an MP4 video up to 1 GB.');
  expect(window.fetch.mock.calls.filter(([url,options])=>url.endsWith('/media') && options?.method==='POST')).toHaveLength(1);
});
test('admin connect button shows one-time setup when no Meta app is configured',async()=>{
  jest.spyOn(window,'fetch').mockImplementation(async url=>({ok:true,status:200,json:async()=>String(url).endsWith('/config')?
    {canConnect:true,instagramReady:false,instagramConnectReady:false,instagramCallback:'https://www.readybartending.com/api/instagram/callback'}:[]}));
  render(<ContentStudio/>);
  const button=await screen.findByRole('button',{name:'Connect Instagram'});fireEvent.click(button);
  expect(screen.getByRole('heading',{name:'One-time Instagram setup'})).toBeTruthy();
  expect(screen.getByText('https://www.readybartending.com/api/instagram/callback')).toBeTruthy();
  expect(window.fetch.mock.calls.some(([url])=>String(url).endsWith('/instagram/connect'))).toBe(false);
});
test('assigned Content Studio staff can prepare drafts but cannot connect the account',async()=>{
  jest.spyOn(window,'fetch').mockImplementation(async url=>({ok:true,status:200,json:async()=>String(url).endsWith('/config')?{canConnect:false,instagramReady:false}:[]}));
  render(<ContentStudio/>);
  await waitFor(()=>expect(screen.getByText(/Ask a full administrator to connect Instagram/)).toBeTruthy());
  expect(screen.queryByRole('button',{name:'Connect Instagram'})).toBeNull();
  expect(screen.getByRole('button',{name:'Save draft'})).toBeTruthy();
});

test('Facebook setup explains the linked Page requirement and rejects unexpected authorization destinations',async()=>{
  localStorage.setItem('internalAuthToken','portal-test-token');
  jest.spyOn(window,'fetch').mockImplementation(async url=>({ok:true,json:async()=>String(url).endsWith('/config')?
    {canConnect:true,instagramReady:false,instagramConnectReady:true,instagramLoginProvider:'facebook',instagramCallback:'https://www.readybartending.com/api/instagram/callback'}:
    String(url).endsWith('/instagram/connect')?{url:'https://www.facebook.com.attacker.example/v26.0/dialog/oauth'}:[]}));
  render(<ContentStudio/>);
  fireEvent.click(await screen.findByRole('button',{name:'Connection setup'}));
  expect(screen.getByText(/Facebook Page ID linked to Ready Bartending/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Connect Instagram'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid Instagram connection link.');
  const call=window.fetch.mock.calls.find(([url])=>String(url).endsWith('/instagram/connect'));
  expect(call[1]).toMatchObject({credentials:'include',headers:{Authorization:'Bearer portal-test-token'}});
  localStorage.removeItem('internalAuthToken');
});
